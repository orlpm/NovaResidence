import { expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, loginAPI, registerConfirmedUser, uniqueEmail, unwrapData } from './auth'
import { buildScenarioProfile } from './demo-data'

export type ResidentAccount = {
  email: string
  password: string
  userId: string
  residentId: string
  token: string
}

export async function createResidentAccount(
  request: APIRequestContext,
  superToken: string,
  unitId: string,
  prefix: string
): Promise<ResidentAccount> {
  const profile = buildScenarioProfile(prefix)
  const email = uniqueEmail(prefix)
  const password = 'Pass123.'

  const createResident = await request.post(`${API_BASE}/residents`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: {
      unitId,
      firstName: profile.residentFirstName,
      lastName: profile.residentLastName,
      email,
      phoneNumber: '5512345678',
      type: 'Owner'
    }
  })
  expect(createResident.status()).toBe(201)
  const residentId = unwrapData<any>(await createResident.json())?.id as string
  expect(residentId).toBeTruthy()

  const inviteResponse = await request.post(`${API_BASE}/residents/${residentId}/invite`, {
    headers: { Authorization: `Bearer ${superToken}` }
  })
  expect(inviteResponse.ok()).toBeTruthy()
  const invitationToken = unwrapData<any>(await inviteResponse.json())?.token as string
  expect(invitationToken).toBeTruthy()

  await registerConfirmedUser(request, {
    email,
    password,
    firstName: profile.residentFirstName,
    lastName: profile.residentLastName,
    invitationToken
  })

  const login = await loginAPI(request, email, password)
  return { email, password, userId: login.userId, residentId, token: login.token }
}
