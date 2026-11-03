import { test, expect, type APIRequestContext } from '@playwright/test'
import { buildScenarioProfile } from './helpers/demo-data'

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:5001/api'
const SUPERADMIN_EMAIL = 'superadmin@novaresidence.com'
const SUPERADMIN_PASSWORD = 'Pass123.'

async function loginAPI(request: APIRequestContext): Promise<{ token: string; userId: string }> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const payload = data.data || data
  const token = payload.accessToken || payload.AccessToken
  const user = payload.user || payload.User || {}
  const userId = user.id || user.Id || payload.userId || payload.UserId

  expect(token).toBeTruthy()
  expect(userId).toBeTruthy()
  return { token, userId }
}

test.describe('Geo and jurisdiction validations', () => {
  test('Catalogs expose MX and states catalog', async ({ request }) => {
    const countriesResponse = await request.get(`${API_BASE}/catalogs/countries`)
    expect(countriesResponse.ok()).toBeTruthy()

    const countriesPayload = await countriesResponse.json()
    const countries = countriesPayload?.data ?? countriesPayload
    expect(Array.isArray(countries)).toBeTruthy()

    const mexico = countries.find((c: any) => c.code === 'MX')
    expect(mexico).toBeTruthy()

    const statesResponse = await request.get(`${API_BASE}/catalogs/states?countryId=${mexico.id}`)
    expect(statesResponse.ok()).toBeTruthy()

    const statesPayload = await statesResponse.json()
    const states = statesPayload?.data ?? statesPayload
    expect(Array.isArray(states)).toBeTruthy()
    expect(states.length).toBeGreaterThanOrEqual(32)
  })

  test('Condominium creation requires state when country has states', async ({ request }) => {
    const auth = await loginAPI(request)
    const profile = buildScenarioProfile('geo.jurisdiction.validation')

    const countriesResponse = await request.get(`${API_BASE}/catalogs/countries`)
    expect(countriesResponse.ok()).toBeTruthy()
    const countriesPayload = await countriesResponse.json()
    const countries = countriesPayload?.data ?? countriesPayload
    const mexico = countries.find((c: any) => c.code === 'MX')
    expect(mexico).toBeTruthy()

    const createResponse = await request.post(`${API_BASE}/condominiums`, {
      headers: { Authorization: `Bearer ${auth.token}` },
      data: {
        userId: auth.userId,
        name: `${profile.condominiumName} sin estado`,
        description: 'Validacion de estado obligatorio para catalogos geograficos',
        street: 'Av. Reforma 100',
        city: 'Ciudad de Mexico',
        state: '',
        postalCode: '06600',
        country: 'Mexico',
        countryId: mexico.id,
        stateId: null,
        neighborhood: 'Centro',
        buildings: [
          {
            name: profile.buildingName,
            type: 'vertical',
            section: 'A',
            totalFloors: 1,
            startsAtGroundFloor: true,
            units: [
              {
                unitNumber: profile.unitNumber,
                floor: 1,
                isCommercial: false,
                area: 50,
                bedrooms: 1,
                bathrooms: 1,
                monthlyMaintenanceFee: 100
              }
            ]
          }
        ]
      }
    })

    expect(createResponse.status()).toBe(400)
  })
})
