import { test, expect } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, unwrapData } from './helpers/auth'

function getAccessToken(payload: any): string | undefined {
  return payload?.accessToken || payload?.AccessToken
}

function getRefreshToken(payload: any): string | undefined {
  return payload?.refreshToken || payload?.RefreshToken
}

test.describe('Auth refresh token', () => {
  test('rotates refresh token and rejects the previous token', async ({ request }) => {
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: { email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD }
    })

    expect(loginResponse.ok()).toBeTruthy()
    const loginPayload = unwrapData(await loginResponse.json())
    const initialAccessToken = getAccessToken(loginPayload)
    const initialRefreshToken = getRefreshToken(loginPayload)

    expect(initialAccessToken).toBeTruthy()
    expect(initialRefreshToken).toBeTruthy()

    const refreshResponse = await request.post(`${API_BASE}/auth/refresh`, {
      data: { refreshToken: initialRefreshToken }
    })

    expect(refreshResponse.ok()).toBeTruthy()
    const refreshedPayload = unwrapData(await refreshResponse.json())
    const rotatedAccessToken = getAccessToken(refreshedPayload)
    const rotatedRefreshToken = getRefreshToken(refreshedPayload)

    expect(rotatedAccessToken).toBeTruthy()
    expect(rotatedRefreshToken).toBeTruthy()
    expect(rotatedAccessToken).not.toBe(initialAccessToken)
    expect(rotatedRefreshToken).not.toBe(initialRefreshToken)

    const protectedResponse = await request.get(`${API_BASE}/superadmin/monitoring`, {
      headers: { Authorization: `Bearer ${rotatedAccessToken}` }
    })
    expect(protectedResponse.ok()).toBeTruthy()

    const oldRefreshResponse = await request.post(`${API_BASE}/auth/refresh`, {
      data: { refreshToken: initialRefreshToken }
    })
    expect(oldRefreshResponse.status()).toBe(401)

    const secondRefreshResponse = await request.post(`${API_BASE}/auth/refresh`, {
      data: { refreshToken: rotatedRefreshToken }
    })
    expect(secondRefreshResponse.ok()).toBeTruthy()
  })

  test('logout revokes refresh token explicitly', async ({ request }) => {
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: { email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD }
    })

    expect(loginResponse.ok()).toBeTruthy()
    const loginPayload = unwrapData(await loginResponse.json())
    const accessToken = getAccessToken(loginPayload)
    const refreshToken = getRefreshToken(loginPayload)

    expect(accessToken).toBeTruthy()
    expect(refreshToken).toBeTruthy()

    const logoutResponse = await request.post(`${API_BASE}/auth/logout`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      data: { refreshToken }
    })

    expect(logoutResponse.ok()).toBeTruthy()

    const refreshAfterLogoutResponse = await request.post(`${API_BASE}/auth/refresh`, {
      data: { refreshToken }
    })

    expect(refreshAfterLogoutResponse.status()).toBe(401)
  })
})