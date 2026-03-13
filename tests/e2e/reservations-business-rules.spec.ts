import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, loginUI, registerConfirmedUser, unwrapData, uniqueEmail } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'
import { createAdminCondominiumScenario, type AdminCondominiumScenario } from './helpers/condominium'

enum ReservationStatus {
  Pending = 0,
  Confirmed = 1,
  InProgress = 2,
  Rejected = 3,
  Cancelled = 4,
  Completed = 5,
  NoShow = 6
}

type ResidentScenario = {
  residentId: string
  residentUserId: string
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
      ?? record.amenityId
      ?? record.AmenityId
      ?? record.condominiumId
      ?? record.CondominiumId
      ?? record.reservationId
      ?? record.ReservationId
    if (typeof candidate === 'string') return candidate
  }

  throw new Error(`No se pudo extraer un id del payload: ${JSON.stringify(payload)}`)
}

function formatDate(daysFromNow: number): string {
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
    email: residentRegistration.email,
    password: residentRegistration.password
  }
}

async function createAmenity(
  request: APIRequestContext,
  token: string,
  condominiumId: string,
  overrides: {
    name: string
    capacity?: number
    requiresApproval?: boolean
    openingTime?: string
    closingTime?: string
    minReservationHours?: number
    maxReservationHours?: number
  }
): Promise<AmenityScenario> {
  const response = await request.post(`${API_BASE}/amenities`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      name: overrides.name,
      description: 'Amenidad disponible para validar reglas de reservacion.',
      type: 3,
      capacity: overrides.capacity ?? 6,
      requiresReservation: true,
      requiresApproval: overrides.requiresApproval ?? false,
      openingTime: overrides.openingTime ?? '08:00',
      closingTime: overrides.closingTime ?? '22:00',
      reservationFee: null,
      minReservationHours: overrides.minReservationHours ?? 1,
      maxReservationHours: overrides.maxReservationHours ?? 4,
      rules: 'Uso exclusivo para residentes con reserva confirmada.'
    }
  })

  expect(response.status()).toBe(201)
  const payload = unwrapData<any>(await response.json())
  return {
    id: asId(payload),
    name: overrides.name
  }
}

async function createReservationByApi(
  request: APIRequestContext,
  token: string,
  resident: ResidentScenario,
  unitId: string,
  amenityId: string,
  payload?: Partial<{ reservationDate: string; startTime: string; endTime: string; numberOfGuests: number; notes: string | null }>
) {
  return request.post(`${API_BASE}/reservations`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      amenityId,
      residentId: resident.residentId,
      unitId,
      reservationDate: payload?.reservationDate ?? formatDate(2),
      startTime: payload?.startTime ?? '10:00',
      endTime: payload?.endTime ?? '12:00',
      numberOfGuests: payload?.numberOfGuests ?? 4,
      notes: payload?.notes ?? 'Reserva creada por API'
    }
  })
}

async function getReservationDetail(request: APIRequestContext, token: string, reservationId: string) {
  const response = await request.get(`${API_BASE}/reservations/${reservationId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(response.ok()).toBeTruthy()
  return await response.json()
}

async function openResidentNewReservation(page: Page, email: string, password: string) {
  await loginUI(page, email, password, /\/resident(\/|$)/)
  await page.goto('/resident/reservations/new')
  await expect(page.getByRole('heading', { name: 'Nueva Reservación' })).toBeVisible()
}

async function createReservationFromResidentUi(page: Page, amenity: AmenityScenario, options?: { date?: string; startTime?: string; endTime?: string; guests?: string }) {
  await page.locator('select').first().selectOption(amenity.id)
  await page.locator('input[type="date"]').fill(options?.date ?? formatDate(2))

  const timeInputs = page.locator('input[type="time"]')
  await timeInputs.nth(0).fill(options?.startTime ?? '10:00')
  await timeInputs.nth(1).fill(options?.endTime ?? '12:00')
  await page.locator('input[type="number"]').fill(options?.guests ?? '4')
  await page.locator('textarea').fill('Reserva solicitada desde el portal de residentes.')
  await page.getByRole('button', { name: 'Crear Reservación' }).click()
  await page.waitForURL(/\/resident\/reservations$/, { timeout: 15000 })
}

test.describe('Reservation business rules', () => {
  test('manual approval reservations stay pending until admin approval and can then be cancelled', async ({ request, page }) => {
    const scenario: AdminCondominiumScenario = await createAdminCondominiumScenario(request, 'reservation.manual')
    const resident = await createResidentScenario(request, scenario.superToken, scenario.unitId, 'reservation.manual.resident')
    const manualAmenityProfile = buildScenarioProfile('reservation.manual.amenity')
    const amenity = await createAmenity(request, scenario.adminToken, scenario.condominiumId, {
      name: `Salon de eventos principal ${manualAmenityProfile.unitNumber}`,
      requiresApproval: true,
      capacity: 6,
      openingTime: '09:00',
      closingTime: '21:00',
      minReservationHours: 1,
      maxReservationHours: 4
    })

    await openResidentNewReservation(page, resident.email, resident.password)
    await createReservationFromResidentUi(page, amenity)

    await expect(page.getByRole('heading', { name: amenity.name })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar' })).toHaveCount(0)

    const residentReservationsResponse = await request.get(`${API_BASE}/reservations/unit/${scenario.unitId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(residentReservationsResponse.ok()).toBeTruthy()
    const residentReservations = await residentReservationsResponse.json()
    const createdReservation = residentReservations.find((item: any) => item.amenityName === amenity.name)
    expect(createdReservation).toBeTruthy()
    expect(createdReservation.status).toBe(ReservationStatus.Pending)

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/reservations')

    const row = page.locator('tbody tr').filter({ hasText: amenity.name }).first()
    await expect(row).toBeVisible()
    await expect(row.getByText('Pendiente')).toBeVisible()
    await row.locator('button').click()
    await page.getByRole('button', { name: /Aprobar$/ }).click()
    await page.getByRole('button', { name: /^Aprobar$/ }).click()

    await expect.poll(async () => {
      const approvedReservation = await getReservationDetail(request, scenario.adminToken, createdReservation.id)
      return approvedReservation.status
    }, { timeout: 15000 }).toBe(ReservationStatus.Confirmed)

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/reservations')
    const residentRow = page.locator('div').filter({ hasText: amenity.name }).first()
    await expect(residentRow).toBeVisible()
    const cancelButton = page.getByRole('button', { name: 'Cancelar' })
    await expect(cancelButton).toHaveCount(1)
    await cancelButton.click()
    await expect(residentRow.getByText('Cancelada', { exact: true })).toBeVisible({ timeout: 10000 })

    await expect.poll(async () => {
      const cancelledReservation = await getReservationDetail(request, scenario.adminToken, createdReservation.id)
      return cancelledReservation.status
    }, { timeout: 15000 }).toBe(ReservationStatus.Cancelled)
  })

  test('automatic approval reservations confirm immediately and reject conflict, capacity and time-window violations', async ({ request, page }) => {
    const scenario: AdminCondominiumScenario = await createAdminCondominiumScenario(request, 'reservation.automatic')
    const resident = await createResidentScenario(request, scenario.superToken, scenario.unitId, 'reservation.auto.resident')
    const automaticAmenityProfile = buildScenarioProfile('reservation.automatic.amenity')
    const amenity = await createAmenity(request, scenario.adminToken, scenario.condominiumId, {
      name: `Terraza panoramica ${automaticAmenityProfile.unitNumber}`,
      requiresApproval: false,
      capacity: 3,
      openingTime: '08:00',
      closingTime: '18:00',
      minReservationHours: 1,
      maxReservationHours: 2
    })

    await openResidentNewReservation(page, resident.email, resident.password)
    await createReservationFromResidentUi(page, amenity, {
      date: formatDate(3),
      startTime: '09:00',
      endTime: '11:00',
      guests: '3'
    })

    const unitReservationsResponse = await request.get(`${API_BASE}/reservations/unit/${scenario.unitId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(unitReservationsResponse.ok()).toBeTruthy()
    const unitReservations = await unitReservationsResponse.json()
    const confirmedReservation = unitReservations.find((item: any) => item.amenityName === amenity.name)
    expect(confirmedReservation).toBeTruthy()
    expect(confirmedReservation.status).toBe(ReservationStatus.Confirmed)

    const conflictingReservation = await createReservationByApi(request, scenario.adminToken, resident, scenario.unitId, amenity.id, {
      reservationDate: formatDate(3),
      startTime: '10:00',
      endTime: '12:00',
      numberOfGuests: 2
    })
    expect(conflictingReservation.status()).toBe(400)
    await expect.soft(conflictingReservation.json()).resolves.toMatchObject({ message: 'This time slot is already reserved' })

    const overCapacityReservation = await createReservationByApi(request, scenario.adminToken, resident, scenario.unitId, amenity.id, {
      reservationDate: formatDate(4),
      startTime: '09:00',
      endTime: '11:00',
      numberOfGuests: 5
    })
    expect(overCapacityReservation.status()).toBe(400)
    await expect.soft(overCapacityReservation.json()).resolves.toMatchObject({ message: 'Number of guests exceeds amenity capacity of 3' })

    const outsideHoursReservation = await createReservationByApi(request, scenario.adminToken, resident, scenario.unitId, amenity.id, {
      reservationDate: formatDate(5),
      startTime: '07:00',
      endTime: '09:00',
      numberOfGuests: 2
    })
    expect(outsideHoursReservation.status()).toBe(400)
    await expect.soft(outsideHoursReservation.json()).resolves.toMatchObject({ message: 'Reservations must be within operating hours (08:00 - 18:00)' })

    const tooLongReservation = await createReservationByApi(request, scenario.adminToken, resident, scenario.unitId, amenity.id, {
      reservationDate: formatDate(6),
      startTime: '12:00',
      endTime: '15:00',
      numberOfGuests: 2
    })
    expect(tooLongReservation.status()).toBe(400)
    await expect.soft(tooLongReservation.json()).resolves.toMatchObject({ message: 'Reservations cannot exceed 2 hour(s)' })
  })
})