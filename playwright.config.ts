import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60000,
  
  use: {
    baseURL: 'http://localhost:3001',
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

  webServer: [
    {
      command: 'dotnet run --project "./src/Backend/NovaResidence.Api/NovaResidence.Api.csproj" --urls "http://localhost:5001"',
      cwd: '.',
      url: 'http://localhost:5001/swagger/index.html',
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'npx vite --port 3001',
      cwd: './src/Frontend/web',
      url: 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
