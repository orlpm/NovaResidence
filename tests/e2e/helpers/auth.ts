import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { confirmUserEmailByEmail, waitForUserIdByEmail } from './sql'
import { buildScenarioProfile } from './demo-data'

export const API_BASE = 'http://localhost:5001/api'
export const SUPERADMIN_EMAIL = 'superadmin@novaresidence.com'
export const SUPERADMIN_PASSWORD = 'Pass123.'

type LoginResult = {
  token: string
  userId: string
}

type RegisterUserOptions = {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  role?: string
  invitationToken?: string
  authenticatedToken?: string
}

export function unwrapData<T = any>(payload: any): T {
  if (payload?.data?.data !== undefined) return payload.data.data as T
  if (payload?.data !== undefined) return payload.data as T
  return payload as T
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
}

export function uniqueEmail(prefix: string): string {
  const profile = buildScenarioProfile(prefix)
  const person = slugify(`${profile.residentFirstName}.${profile.residentLastName}`)
  return `${person}.${Date.now().toString().slice(-4)}@demo.test`
}

export async function loginAPI(request: APIRequestContext, email: string, password: string): Promise<LoginResult> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const payload = unwrapData(data)
  const token = payload?.accessToken || payload?.AccessToken || data?.accessToken || data?.AccessToken
  const user = payload?.user || payload?.User || data?.user || data?.User || payload
  const userId = user?.id || user?.Id || payload?.userId || payload?.UserId || data?.userId || data?.UserId

  expect(token).toBeTruthy()
  expect(userId).toBeTruthy()
  return { token, userId }
}

export async function loginSuperadminAPI(request: APIRequestContext): Promise<LoginResult> {
  return loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
}

export async function loginUI(page: Page, email: string, password: string, expectedPath: RegExp = /\/(resident|admin|superadmin|subadmin|accountant)(\/|$)/) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(expectedPath, { timeout: 15000 })
}

export async function submitLoginUI(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click()
}

export async function registerUser(request: APIRequestContext, options: RegisterUserOptions) {
  const email = options.email ?? uniqueEmail(options.role?.toLowerCase() ?? 'user')
  const password = options.password ?? 'Pass123.'

  const response = await request.post(`${API_BASE}/auth/register`, {
    headers: options.authenticatedToken ? { Authorization: `Bearer ${options.authenticatedToken}` } : undefined,
    data: {
      email,
      password,
      firstName: options.firstName ?? 'Usuario',
      lastName: options.lastName ?? `Demo ${Date.now().toString().slice(-2)}`,
      phoneNumber: options.phoneNumber ?? '5512345678',
      ...(options.role ? { role: options.role } : {}),
      ...(options.invitationToken ? { invitationToken: options.invitationToken } : {})
    }
  })

  expect(response.ok()).toBeTruthy()
  return { email, password, response, payload: await response.json() }
}

export async function registerConfirmedUser(request: APIRequestContext, options: RegisterUserOptions) {
  const result = await registerUser(request, options)
  const userId = await confirmUserEmailByEmail(result.email)
  return { ...result, userId }
}

export async function ensureConfirmedUserId(email: string): Promise<string> {
  return waitForUserIdByEmail(email)
}