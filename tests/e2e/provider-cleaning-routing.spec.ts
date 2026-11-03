import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { buildScenarioProfile } from './helpers/demo-data'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { uniqueEmail } from './helpers/auth'

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:5001/api'
const SUPERADMIN_EMAIL = 'superadmin@novaresidence.com'
const SUPERADMIN_PASSWORD = 'Pass123.'

function unwrapData(payload: any): any {
  if (payload?.data?.data !== undefined) return payload.data.data
  if (payload?.data !== undefined) return payload.data
  return payload
}

async function loginAPI(request: APIRequestContext, email: string, password: string): Promise<{ token: string; userId: string; rawRole?: string }> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const payload = unwrapData(data)
  const token = payload?.accessToken || data?.accessToken || data?.AccessToken
  const userObj = payload?.user || data?.user || data?.User || payload
  const userId = userObj?.id || userObj?.Id || payload?.userId || data?.userId
  const rawRole = userObj?.role || userObj?.Role || payload?.defaultRole || payload?.DefaultRole

  expect(token).toBeTruthy()
  expect(userId).toBeTruthy()
  return { token, userId, rawRole }
}

async function loginUI(page: Page, email: string, password: string, expectedPath: RegExp) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(expectedPath, { timeout: 15000 })
}

test.describe('Provider and Cleaning routing', () => {
  test('Provider: can be created via API and lands on provider dashboard in Front', async ({ request, page }) => {
    const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const providerProfile = buildScenarioProfile('provider.route')

    const providerEmail = uniqueEmail('provider.route')
    const providerPassword = 'Pass123.'

    const registerProvider = await request.post(`${API_BASE}/auth/register`, {
      headers: { Authorization: `Bearer ${superadmin.token}` },
      data: {
        email: providerEmail,
        password: providerPassword,
        firstName: providerProfile.residentFirstName,
        lastName: providerProfile.residentLastName,
        phoneNumber: '5512345678',
        role: 'Provider'
      }
    })

    expect(registerProvider.status()).toBe(200)

    const providerLogin = await loginAPI(request, providerEmail, providerPassword)
    expect((providerLogin.rawRole || '').toString().toLowerCase()).toMatch(/provider|serviceprovider/)

    await loginUI(page, providerEmail, providerPassword, /\/provider(\/|$)/)
    await expect(page).toHaveURL(/\/provider(\/|$)/)
    await expect(page.getByRole('heading', { name: 'Panel de Proveedor' })).toBeVisible()
  })

  test('Cleaning: can be created via API and lands on cleaning dashboard in Front', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'cleaning.route')
    const cleaningProfile = buildScenarioProfile('cleaning.route')

    const cleaningEmail = uniqueEmail('cleaning.route')
    const cleaningPassword = 'Pass123.'

    const createCleaning = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        email: cleaningEmail,
        password: cleaningPassword,
        firstName: cleaningProfile.residentFirstName,
        lastName: cleaningProfile.residentLastName,
        phoneNumber: '5512345678',
        role: 'Cleaning',
        condominiumId: scenario.condominiumId
      }
    })

    expect(createCleaning.ok()).toBeTruthy()

    await loginAPI(request, cleaningEmail, cleaningPassword)

    await loginUI(page, cleaningEmail, cleaningPassword, /\/cleaning(\/|$)/)
    await expect(page).toHaveURL(/\/cleaning(\/|$)/)
    await expect(page.getByRole('heading', { name: 'Panel de Limpieza' })).toBeVisible()
  })
})
