import { test, expect } from '@playwright/test'
import { API_BASE, loginUI, unwrapData } from './helpers/auth'
import { asId, createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

function formatDate(daysAhead: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString().slice(0, 10)
}

test.describe('Alta de amenidades', () => {
  test('el admin crea la amenidad en pantalla y el residente puede reservarla', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'amenity.ui')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'amenity.ui.resident')
    const name = `Alberca ${buildScenarioProfile('amenity.ui').readableLabel}`

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/amenities')
    await page.getByRole('button', { name: 'Nueva Amenidad' }).click()
    await page.getByPlaceholder('Ej: Alberca Principal').fill(name)
    await page.getByRole('button', { name: 'Crear Amenidad' }).click()
    await expect(page.getByText(name)).toBeVisible({ timeout: 15000 })

    const list = await request.get(`${API_BASE}/amenities/condominium/${scenario.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(list.ok()).toBeTruthy()
    const amenities = unwrapData<Array<{ id: string; name: string }>>(await list.json())
    const amenity = amenities.find(item => item.name === name)
    expect(amenity?.id).toBeTruthy()

    const reservation = await request.post(`${API_BASE}/reservations`, {
      headers: { Authorization: `Bearer ${resident.token}` },
      data: {
        amenityId: amenity!.id,
        residentId: resident.residentId,
        unitId: scenario.unitId,
        reservationDate: formatDate(2),
        startTime: '10:00',
        endTime: '12:00',
        numberOfGuests: 2,
        notes: 'Reserva sobre la amenidad creada en pantalla'
      }
    })
    expect(reservation.ok()).toBeTruthy()
    const reservationId = asId(unwrapData(await reservation.json()))

    const detail = await request.get(`${API_BASE}/reservations/${reservationId}`, {
      headers: { Authorization: `Bearer ${resident.token}` }
    })
    expect(detail.ok()).toBeTruthy()
  })
})
