import { expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, registerConfirmedUser, uniqueEmail, unwrapData } from './auth'
import { buildScenarioProfile } from './demo-data'
import { runSql } from './sql'

export type AdminCondominiumScenario = {
  superToken: string
  superUserId: string
  adminUserId: string
  adminEmail: string
  adminPassword: string
  adminToken: string
  condominiumId: string
  unitId: string
}

export function asId(payload: unknown): string {
  if (typeof payload === 'string') return payload

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const candidate = record.id
      ?? record.Id
      ?? record.condominiumId
      ?? record.CondominiumId
      ?? record.chargeId
      ?? record.ChargeId
      ?? record.incidentId
      ?? record.IncidentId
      ?? record.visitId
      ?? record.VisitId
      ?? record.paymentId
      ?? record.PaymentId
      ?? record.mapId
      ?? record.MapId

    if (typeof candidate === 'string') return candidate
  }

  throw new Error(`No se pudo extraer un id del payload: ${JSON.stringify(payload)}`)
}

function ensureAdminCondominiumRole(userId: string, condominiumId: string) {
  runSql(`
IF NOT EXISTS (
    SELECT 1
    FROM [auth].[UserCondominiumRoles]
    WHERE [UserId] = '${userId}'
      AND [CondominiumId] = '${condominiumId}'
      AND [Role] = 1
)
BEGIN
    INSERT INTO [auth].[UserCondominiumRoles] ([CondominiumId], [Role], [AssignedAt], [UserId])
    VALUES ('${condominiumId}', 1, SYSUTCDATETIME(), '${userId}')
END
`)
}

export async function createAdminCondominiumScenario(
  request: APIRequestContext,
  prefix: string
): Promise<AdminCondominiumScenario> {
  const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
  const profile = buildScenarioProfile(prefix)
  const admin = await registerConfirmedUser(request, {
    email: uniqueEmail(`${prefix}.admin`),
    firstName: profile.adminFirstName,
    lastName: profile.adminLastName,
    role: 'admin'
  })

  const createCondominium = await request.post(`${API_BASE}/condominiums`, {
    headers: { Authorization: `Bearer ${superadmin.token}` },
    data: {
      userId: admin.userId,
      name: profile.condominiumName,
      description: profile.condominiumDescription,
      street: 'Av. Operaciones 100',
      city: 'Ciudad de Mexico',
      state: 'Ciudad de Mexico',
      postalCode: '03100',
      country: 'Mexico',
      neighborhood: 'Del Valle',
      buildings: [
        {
          name: profile.buildingName,
          type: 'vertical',
          section: 'A',
          totalFloors: 2,
          startsAtGroundFloor: true,
          units: [
            {
              unitNumber: profile.unitNumber,
              floor: 1,
              isCommercial: false,
              area: 90,
              bedrooms: 2,
              bathrooms: 2,
              monthlyMaintenanceFee: 1400
            }
          ]
        }
      ]
    }
  })

  expect(createCondominium.status()).toBe(201)
  const condominiumId = asId(unwrapData(await createCondominium.json()))
  const condominiumDetail = await request.get(`${API_BASE}/condominiums/${condominiumId}`, {
    headers: { Authorization: `Bearer ${superadmin.token}` }
  })
  expect(condominiumDetail.ok()).toBeTruthy()
  const detail = unwrapData<any>(await condominiumDetail.json())
  const unitId = detail?.buildings?.[0]?.units?.[0]?.id as string | undefined
  expect(unitId).toBeTruthy()

  const adminLogin = await loginAPI(request, admin.email, admin.password)
  ensureAdminCondominiumRole(admin.userId, condominiumId)
  ensureAdminCondominiumRole(adminLogin.userId, condominiumId)

  return {
    superToken: superadmin.token,
    superUserId: superadmin.userId,
    adminUserId: adminLogin.userId,
    adminEmail: admin.email,
    adminPassword: admin.password,
    adminToken: adminLogin.token,
    condominiumId,
    unitId: unitId!
  }
}