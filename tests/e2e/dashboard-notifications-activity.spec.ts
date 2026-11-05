import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { API_BASE, loginAPI, loginUI, registerConfirmedUser, unwrapData, uniqueEmail } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'
import { createAdminCondominiumScenario, type AdminCondominiumScenario } from './helpers/condominium'
import { ensureCondominiumRole } from './helpers/sql'

type ResidentScenario = {
  residentId: string
  residentUserId: string
  residentToken: string
  email: string
  password: string
}

type AmenityScenario = {
  id: string
  name: string
}

function asId(payload: unknown): string {
  if (typeof payload === 'string') return payload

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const candidate = record.id
      ?? record.Id
      ?? record.condominiumId
      ?? record.CondominiumId
      ?? record.paymentId
      ?? record.PaymentId
      ?? record.incidentId
      ?? record.IncidentId
      ?? record.reservationId
      ?? record.ReservationId
      ?? record.amenityId
      ?? record.AmenityId

    if (typeof candidate === 'string') return candidate
  }

  throw new Error(`No se pudo extraer un id del payload: ${JSON.stringify(payload)}`)
}

function isoDate(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString()
}

function dateOnly(daysFromNow: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function createResidentScenario(
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

  const residentRegistration = await registerConfirmedUser(request, {
    email,
    password,
    firstName: profile.residentFirstName,
    lastName: profile.residentLastName,
    invitationToken: invitePayload?.token
  })

  const residentLogin = await loginAPI(request, residentRegistration.email, residentRegistration.password)

  return {
    residentId,
    residentUserId: residentLogin.userId,
    residentToken: residentLogin.token,
    email: residentRegistration.email,
    password: residentRegistration.password
  }
}

async function createAmenity(
  request: APIRequestContext,
  token: string,
  condominiumId: string,
  name: string
): Promise<AmenityScenario> {
  const response = await request.post(`${API_BASE}/amenities`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      name,
      description: 'Amenidad generada para pruebas del dashboard.',
      type: 3,
      capacity: 8,
      requiresReservation: true,
      requiresApproval: false,
      openingTime: '08:00',
      closingTime: '22:00',
      reservationFee: null,
      minReservationHours: 1,
      maxReservationHours: 4,
      rules: 'Uso exclusivo para pruebas automatizadas.'
    }
  })

  expect(response.status()).toBe(201)
  const payload = unwrapData<any>(await response.json())

  return {
    id: asId(payload),
    name
  }
}

async function createCharge(
  request: APIRequestContext,
  token: string,
  scenario: AdminCondominiumScenario,
  concept: string,
  amount: number
): Promise<string> {
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const response = await request.post(`${API_BASE}/billing/charges`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId: scenario.condominiumId,
      unitId: scenario.unitId,
      concept,
      feeType: 0,
      amount,
      dueDate: dueDate.toISOString(),
      billingPeriodMonth: dueDate.getMonth() + 1,
      billingPeriodYear: dueDate.getFullYear(),
      applyLateFee: false
    }
  })

  expect(response.status()).toBe(201)
  return asId(await response.json())
}

async function recordPayment(
  request: APIRequestContext,
  token: string,
  chargeId: string,
  receivedById: string,
  amount: number
): Promise<string> {
  const response = await request.post(`${API_BASE}/billing/payments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      chargeId,
      amount,
      paymentMethod: 0,
      paymentDate: isoDate(-1),
      receivedById,
      referenceNumber: `DASH-${Date.now().toString().slice(-4)}`
    }
  })

  expect(response.status()).toBe(200)
  return asId(await response.json())
}

async function createIncident(
  request: APIRequestContext,
  token: string,
  condominiumId: string,
  reportedById: string,
  title: string,
  unitId?: string
): Promise<string> {
  const response = await request.post(`${API_BASE}/incidents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      reportedById,
      title,
      description: `${title} generado desde Playwright`,
      type: 0,
      priority: 1,
      unitId: unitId ?? null,
      location: 'Lobby principal'
    }
  })

  expect(response.status()).toBe(201)
  return asId(await response.json())
}

async function createReservation(
  request: APIRequestContext,
  token: string,
  resident: ResidentScenario,
  scenario: AdminCondominiumScenario,
  amenityId: string
): Promise<string> {
  const response = await request.post(`${API_BASE}/reservations`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      amenityId,
      residentId: resident.residentId,
      unitId: scenario.unitId,
      condominiumId: scenario.condominiumId,
      reservationDate: dateOnly(2),
      startTime: '10:00',
      endTime: '12:00',
      numberOfGuests: 4,
      notes: 'Reservación para validar actividad reciente'
    }
  })

  expect(response.status()).toBe(200)
  return asId(await response.json())
}

async function createNotification(
  request: APIRequestContext,
  token: string,
  payload: {
    condominiumId: string
    userId: string
    type: number
    title: string
    message: string
    priority?: number
    actionUrl?: string | null
  }
): Promise<string> {
  const response = await request.post(`${API_BASE}/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId: payload.condominiumId,
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      priority: payload.priority ?? 1,
      actionUrl: payload.actionUrl ?? null
    }
  })

  expect(response.ok()).toBeTruthy()
  return asId(await response.json())
}

async function getNotificationSummary(
  request: APIRequestContext,
  token: string,
  userId: string,
  condominiumId: string
) {
  const response = await request.get(`${API_BASE}/notifications/summary/user/${userId}/condominium/${condominiumId}?recentCount=8`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  expect(response.ok()).toBeTruthy()
  return await response.json()
}

async function openNotificationBell(page: Page) {
  const bell = page.getByRole('button', { name: 'Notificaciones' })
  await expect(bell).toBeVisible({ timeout: 20000 })
  await bell.click()
  await expect(page.getByRole('heading', { name: 'Notificaciones' })).toBeVisible()
  await expect(page.getByText('Notificaciones no disponibles')).not.toBeVisible({ timeout: 20000 })
  return bell
}

test.describe('Dashboard notifications and activity', () => {
  test('admin notification bell lists unread items and can mark all as read', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'dashboard.admin.notifications')
    const notificationTitle = `Aviso administrativo ${Date.now().toString().slice(-4)}`

    await createNotification(request, scenario.adminToken, {
      condominiumId: scenario.condominiumId,
      userId: scenario.adminUserId,
      type: 10,
      title: notificationTitle,
      message: 'Se generó una alerta operativa para validar la campana.'
    })

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await openNotificationBell(page)

    await expect(page.getByText(notificationTitle)).toBeVisible()
    await expect(page.getByText(/1 sin leer/i)).toBeVisible()

    await page.locator('button[title="Marcar todo como leído"]').click()
    await expect(page.getByText(/Todo al día/i)).toBeVisible({ timeout: 15000 })

    await expect.poll(async () => {
      const summary = await getNotificationSummary(request, scenario.adminToken, scenario.adminUserId, scenario.condominiumId)
      return summary.unreadCount
    }, { timeout: 15000 }).toBe(0)

    const notificationRow = page.getByText(notificationTitle).locator('xpath=ancestor::div[contains(@class,"cursor-pointer")]')
    await notificationRow.hover()
    await notificationRow.getByTitle('Eliminar').click()
    await expect(page.getByText(notificationTitle)).not.toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Sin notificaciones')).toBeVisible()
  })

  test('resident payment notification opens the payments module and marks the notification as read', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'dashboard.resident.notifications')
    const resident = await createResidentScenario(request, scenario.superToken, scenario.unitId, 'dashboard.resident.notifications.user')
    const notificationTitle = `Pago pendiente ${Date.now().toString().slice(-4)}`

    await createNotification(request, scenario.superToken, {
      condominiumId: scenario.condominiumId,
      userId: resident.residentUserId,
      type: 5,
      title: notificationTitle,
      message: 'Revisa tu saldo pendiente desde el módulo de pagos.'
    })

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await openNotificationBell(page)
    await page.getByText(notificationTitle).click()

    await expect(page).toHaveURL(/\/resident\/payments$/, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Mis Pagos' })).toBeVisible()

    await expect.poll(async () => {
      const summary = await getNotificationSummary(request, resident.residentToken, resident.residentUserId, scenario.condominiumId)
      return summary.unreadCount
    }, { timeout: 15000 }).toBe(0)
  })

  test('admin dashboard recent activity renders seeded operational events', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'dashboard.admin.activity')
    const residentProfile = buildScenarioProfile('dashboard.admin.activity.resident')
    const incidentTitle = `Falla de acceso ${Date.now().toString().slice(-4)}`

    const createResident = await request.post(`${API_BASE}/residents`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        unitId: scenario.unitId,
        firstName: residentProfile.residentFirstName,
        lastName: residentProfile.residentLastName,
        email: uniqueEmail('dashboard.admin.activity.resident'),
        phoneNumber: '5512345678',
        type: 'Tenant'
      }
    })

    expect(createResident.status()).toBe(201)
    const incidentId = await createIncident(request, scenario.adminToken, scenario.condominiumId, scenario.adminUserId, incidentTitle, scenario.unitId)

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await expect(page.getByRole('heading', { name: 'Dashboard Administrativo' })).toBeVisible()
    await expect(page.getByText('Cargando condominios...')).not.toBeVisible({ timeout: 30000 })

    const incidentsCard = page.locator('h3', { hasText: 'Incidencias Abiertas' }).locator('xpath=..')
    await expect(incidentsCard.getByText('1', { exact: true })).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('0 pagos pendientes')).toBeVisible()

    const incidentActivity = page.locator('p').filter({ hasText: incidentTitle }).first()
    await expect(incidentActivity).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(/Invitación enviada|Residente registrado/i).first()).toBeVisible({ timeout: 20000 })

    await incidentActivity.click()
    await expect(page).toHaveURL(new RegExp(`/admin/incidents\\?id=${incidentId}`), { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Detalle de Incidencia' })).toBeVisible()
    await expect(page.getByRole('heading', { name: incidentTitle })).toBeVisible()
  })

  test('la campana del administrador abre la incidencia y la marca como leída', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'dashboard.admin.bell.incident')
    const incidentTitle = `Fuga campana ${Date.now().toString().slice(-4)}`
    const incidentId = await createIncident(request, scenario.adminToken, scenario.condominiumId, scenario.adminUserId, incidentTitle, scenario.unitId)

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await openNotificationBell(page)
    await expect(page.getByText('Nueva incidencia').first()).toBeVisible({ timeout: 20000 })
    await page.getByText(incidentTitle).first().click()

    await expect(page).toHaveURL(new RegExp(`/admin/incidents\\?id=${incidentId}`), { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Detalle de Incidencia' })).toBeVisible()

    await expect.poll(async () => {
      const summary = await getNotificationSummary(request, scenario.adminToken, scenario.adminUserId, scenario.condominiumId)
      const item = (summary.recentNotifications ?? summary.RecentNotifications ?? []).find((notification: { message?: string; isRead?: boolean }) => notification.message === incidentTitle)
      return item?.isRead ?? false
    }, { timeout: 15000 }).toBe(true)
  })

  test('el subadministrador ve la actividad de su condominio y abre el recurso', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'dashboard.subadmin.activity')
    const profile = buildScenarioProfile('dashboard.subadmin.activity')
    const email = uniqueEmail('dashboard.subadmin.activity')
    const { password } = await registerConfirmedUser(request, {
      email,
      firstName: profile.residentFirstName,
      lastName: profile.residentLastName,
      role: 'SubAdmin'
    })
    const subLogin = await loginAPI(request, email, password)
    expect(subLogin.userId).toBeTruthy()
    const grant = await request.post(`${API_BASE}/permissions/user/${subLogin.userId}/grant`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: { permissionCode: 'incidents.view' }
    })
    expect(grant.ok()).toBeTruthy()
    await ensureCondominiumRole(subLogin.userId!, scenario.condominiumId, 2)

    const incidentTitle = `Subadmin ${Date.now().toString().slice(-4)}`
    const incidentId = await createIncident(request, scenario.adminToken, scenario.condominiumId, scenario.adminUserId, incidentTitle, scenario.unitId)

    await loginUI(page, email, password, /\/subadmin(\/|$)/)
    await expect(page.getByRole('heading', { name: 'Dashboard Administrativo' })).toBeVisible()
    await expect(page.getByText('Cargando condominios...')).not.toBeVisible({ timeout: 30000 })
    await expect(page.locator('h3', { hasText: 'Incidencias Abiertas' }).locator('xpath=..').getByText('1', { exact: true })).toBeVisible({ timeout: 20000 })

    await page.locator('p').filter({ hasText: incidentTitle }).first().click()
    await expect(page).toHaveURL(new RegExp(`/subadmin/incidents\\?id=${incidentId}`), { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Detalle de Incidencia' })).toBeVisible()

    await page.goto('/subadmin/dashboard')
    await openNotificationBell(page)
    await page.getByText(incidentTitle).first().click()
    await expect(page).toHaveURL(new RegExp(`/subadmin/incidents\\?id=${incidentId}`), { timeout: 15000 })
  })

  test('resident dashboard recent activity shows incidents, reservations, and payments from real data', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'dashboard.resident.activity')
    const resident = await createResidentScenario(request, scenario.superToken, scenario.unitId, 'dashboard.resident.activity.user')
    const amenityName = `Terraza dashboard ${Date.now().toString().slice(-4)}`
    const concept = `Cuota dashboard ${Date.now().toString().slice(-4)}`
    const incidentTitle = `Incidente dashboard ${Date.now().toString().slice(-4)}`
    const amenity = await createAmenity(request, scenario.adminToken, scenario.condominiumId, amenityName)

    await createReservation(request, scenario.adminToken, resident, scenario, amenity.id)
    await createIncident(request, resident.residentToken, scenario.condominiumId, resident.residentUserId, incidentTitle, scenario.unitId)
    const chargeId = await createCharge(request, scenario.superToken, scenario, concept, 1350)
    await recordPayment(request, scenario.superToken, chargeId, scenario.adminUserId, 1350)

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await expect(page.getByRole('heading', { name: 'Mi Dashboard' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Actividad Reciente' })).toBeVisible()

    const recentActivityCard = page.getByRole('heading', { name: 'Actividad Reciente' }).locator('xpath=..')

    await expect(recentActivityCard.getByText('Pago registrado')).toBeVisible({ timeout: 20000 })
    await expect(recentActivityCard.getByText(concept)).toBeVisible({ timeout: 20000 })
    await expect(recentActivityCard.getByText(/Reservación confirmada|Reservación pendiente|Actualización de reservación/i)).toBeVisible({ timeout: 20000 })
    await expect(recentActivityCard.locator('p').filter({ hasText: amenityName }).first()).toBeVisible({ timeout: 20000 })
    await expect(recentActivityCard.getByText('Incidente reportado')).toBeVisible({ timeout: 20000 })
    await expect(recentActivityCard.getByText(incidentTitle)).toBeVisible({ timeout: 20000 })
  })
})