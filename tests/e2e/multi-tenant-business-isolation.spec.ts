import { expect, test, type APIRequestContext } from '@playwright/test'
import { API_BASE, registerConfirmedUser, uniqueEmail, unwrapData } from './helpers/auth'
import { asId, createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'

type ResidentScenario = {
  residentId: string
  userId: string
}

async function assertForbidden(response: Awaited<ReturnType<APIRequestContext['get']>>) {
  expect(response.status(), await response.text()).toBe(403)
}

async function createResidentAndRegisterUser(
  request: APIRequestContext,
  superToken: string,
  unitId: string,
  prefix: string
): Promise<ResidentScenario> {
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
      type: 'Tenant'
    }
  })

  expect(createResident.status()).toBe(201)
  const residentId = asId(unwrapData(await createResident.json()))

  const inviteResponse = await request.post(`${API_BASE}/residents/${residentId}/invite`, {
    headers: { Authorization: `Bearer ${superToken}` }
  })
  expect(inviteResponse.ok()).toBeTruthy()

  const invitePayload = unwrapData<any>(await inviteResponse.json())
  const invitationToken = invitePayload?.token as string | undefined
  expect(invitationToken).toBeTruthy()

  const registration = await registerConfirmedUser(request, {
    email,
    password,
    firstName: profile.residentFirstName,
    lastName: profile.residentLastName,
    invitationToken
  })

  return {
    residentId,
    userId: registration.userId
  }
}

async function createVisit(request: APIRequestContext, token: string, condominiumId: string, unitId: string, requestedById: string) {
  const profile = buildScenarioProfile('tenant.isolation.visit')
  const response = await request.post(`${API_BASE}/visits`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      unitId,
      requestedById,
      visitorName: `${profile.residentFirstName} ${profile.residentLastName}`,
      type: 0,
      expectedArrival: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      expectedDeparture: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      visitorPhone: '5511111111',
      visitorCount: 1,
      purpose: 'Prueba aislamiento'
    }
  })

  expect(response.ok(), await response.text()).toBeTruthy()
  return asId(unwrapData(await response.json()))
}

async function createIncident(request: APIRequestContext, token: string, condominiumId: string, reportedById: string) {
  const profile = buildScenarioProfile('tenant.isolation.incident')
  const response = await request.post(`${API_BASE}/incidents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      reportedById,
      title: `Reporte de acceso ${profile.readableLabel}`,
      description: 'Incidencia para probar aislamiento multi-tenant',
      type: 0,
      priority: 1,
      location: 'Lobby'
    }
  })

  expect(response.status(), await response.text()).toBe(201)
  return asId(await response.json())
}

async function createProcedure(request: APIRequestContext, token: string, condominiumId: string, residentId: string) {
  const profile = buildScenarioProfile('tenant.isolation.procedure')
  const response = await request.post(`${API_BASE}/procedures`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      residentId,
      type: 0,
      title: `Actualizacion de expediente ${profile.readableLabel}`,
      description: 'Trámite para validar aislamiento',
      requirements: 'INE y comprobante de domicilio',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      isMandatory: true
    }
  })

  expect(response.ok(), await response.text()).toBeTruthy()
  return asId(unwrapData(await response.json()))
}

async function createCharge(request: APIRequestContext, token: string, condominiumId: string, unitId: string) {
  const profile = buildScenarioProfile('tenant.isolation.charge')
  const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
  const response = await request.post(`${API_BASE}/billing/charges`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      unitId,
      concept: `Cuota extraordinaria ${profile.readableLabel}`,
      feeType: 0,
      amount: 1500,
      dueDate: dueDate.toISOString(),
      billingPeriodMonth: dueDate.getMonth() + 1,
      billingPeriodYear: dueDate.getFullYear(),
      applyLateFee: false
    }
  })

  expect(response.status(), await response.text()).toBe(201)
  return asId(await response.json())
}

async function createAnnouncement(request: APIRequestContext, token: string, condominiumId: string) {
  const profile = buildScenarioProfile('tenant.isolation.announcement')
  const response = await request.post(`${API_BASE}/communications/announcements`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      title: `Aviso operativo ${profile.readableLabel}`,
      content: 'Contenido para validar aislamiento',
      type: 0,
      priority: 1,
      publishImmediately: false
    }
  })

  expect(response.status(), await response.text()).toBe(201)
  return asId(await response.json())
}

test.describe('Multi-tenant business isolation', () => {
  test('admin of condominium A cannot consult or operate data from condominium B', async ({ request }) => {
    const scenarioA = await createAdminCondominiumScenario(request, 'tenant.isolation.a')
    const scenarioB = await createAdminCondominiumScenario(request, 'tenant.isolation.b')
    const residentB = await createResidentAndRegisterUser(request, scenarioB.superToken, scenarioB.unitId, 'tenant.isolation.resident')

    const visitId = await createVisit(request, scenarioB.adminToken, scenarioB.condominiumId, scenarioB.unitId, scenarioB.adminUserId)
    const incidentId = await createIncident(request, scenarioB.adminToken, scenarioB.condominiumId, scenarioB.adminUserId)
    const procedureId = await createProcedure(request, scenarioB.adminToken, scenarioB.condominiumId, residentB.residentId)
    const chargeId = await createCharge(request, scenarioB.adminToken, scenarioB.condominiumId, scenarioB.unitId)
    const announcementId = await createAnnouncement(request, scenarioB.adminToken, scenarioB.condominiumId)

    await assertForbidden(await request.get(`${API_BASE}/visits/condominium/${scenarioB.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.get(`${API_BASE}/visits/${visitId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.post(`${API_BASE}/visits`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` },
      data: {
        condominiumId: scenarioB.condominiumId,
        unitId: scenarioB.unitId,
        requestedById: scenarioB.adminUserId,
        visitorName: 'Intento ajeno',
        type: 0,
        expectedArrival: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        expectedDeparture: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        purpose: 'Debe fallar'
      }
    }))
    await assertForbidden(await request.post(`${API_BASE}/visits/${visitId}/cancel`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))

    await assertForbidden(await request.get(`${API_BASE}/incidents/condominium/${scenarioB.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.get(`${API_BASE}/incidents/${incidentId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.post(`${API_BASE}/incidents`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` },
      data: {
        condominiumId: scenarioB.condominiumId,
        reportedById: scenarioB.adminUserId,
        title: 'Intento ajeno',
        description: 'Debe fallar por tenant',
        type: 0,
        priority: 1,
        location: 'Acceso principal'
      }
    }))
    await assertForbidden(await request.post(`${API_BASE}/incidents/${incidentId}/acknowledge`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))

    await assertForbidden(await request.get(`${API_BASE}/procedures/condominium/${scenarioB.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.get(`${API_BASE}/procedures/resident/${residentB.userId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.post(`${API_BASE}/procedures`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` },
      data: {
        condominiumId: scenarioB.condominiumId,
        residentId: residentB.residentId,
        type: 0,
        title: 'Intento ajeno',
        description: 'Debe fallar por tenant',
        requirements: 'INE',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isMandatory: true
      }
    }))
    await assertForbidden(await request.post(`${API_BASE}/procedures/${procedureId}/cancel`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))

    await assertForbidden(await request.get(`${API_BASE}/billing/charges/condominium/${scenarioB.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.get(`${API_BASE}/billing/charges/${chargeId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.get(`${API_BASE}/billing/payments/pending/${scenarioB.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.post(`${API_BASE}/billing/charges`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` },
      data: {
        condominiumId: scenarioB.condominiumId,
        unitId: scenarioB.unitId,
        concept: 'Intento ajeno',
        feeType: 0,
        amount: 999,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        billingPeriodMonth: new Date().getMonth() + 1,
        billingPeriodYear: new Date().getFullYear(),
        applyLateFee: false
      }
    }))
    await assertForbidden(await request.post(`${API_BASE}/billing/charges/${chargeId}/cancel`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` },
      data: { reason: 'Intento ajeno' }
    }))

    await assertForbidden(await request.get(`${API_BASE}/communications/announcements/condominium/${scenarioB.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.get(`${API_BASE}/communications/announcements/${announcementId}`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
    await assertForbidden(await request.post(`${API_BASE}/communications/announcements`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` },
      data: {
        condominiumId: scenarioB.condominiumId,
        title: 'Intento ajeno',
        content: 'Debe fallar por tenant',
        type: 0,
        priority: 1,
        publishImmediately: false
      }
    }))
    await assertForbidden(await request.post(`${API_BASE}/communications/announcements/${announcementId}/publish`, {
      headers: { Authorization: `Bearer ${scenarioA.adminToken}` }
    }))
  })
})
