import { defineConfig, devices } from '@playwright/test';

const remoteBaseUrl = process.env.E2E_BASE_URL;
const isRemote = Boolean(remoteBaseUrl);

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: isRemote ? 300000 : 60000,
  
  use: {
    baseURL: remoteBaseUrl || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: isRemote ? undefined : [
    {
      command: 'dotnet run --project "./src/Backend/NovaResidence.Api/NovaResidence.Api.csproj" --urls "http://localhost:5001"',
      cwd: '.',
      url: 'http://localhost:5001/swagger/index.html',
      reuseExistingServer: true,
      timeout: 240000,
    },
    {
      command: 'npx vite --port 3001',
      cwd: './src/Frontend/web',
      url: 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
