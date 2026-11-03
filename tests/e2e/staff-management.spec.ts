import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { createAdminCondominiumScenario, asId } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { uniqueEmail } from './helpers/auth'

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:5001/api'
const SUPERADMIN_EMAIL = 'superadmin@novaresidence.com'
const SUPERADMIN_PASSWORD = 'Pass123.'

async function loginAPI(request: APIRequestContext, email: string, password: string): Promise<{ token: string; userId: string }> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const token = data.data?.accessToken || data.accessToken || data.AccessToken
  const userId = data.data?.user?.id || data.user?.id || data.User?.Id || data.data?.User?.Id || data.data?.userId || data.userId
  expect(token).toBeTruthy()
  expect(userId).toBeTruthy()
  return { token, userId }
}

async function loginUI(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/superadmin(\/|$)/, { timeout: 15000 })
}

test.describe('Staff Management E2E', () => {
  test('SuperAdmin can create Maintenance, Security and Cleaning staff via API and list them', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'staff.ops.list')

    const roles: Array<'Maintenance' | 'SecurityGuard' | 'Cleaning'> = ['Maintenance', 'SecurityGuard', 'Cleaning']
    const createdEmails: Array<{ email: string; role: string }> = []

    for (const role of roles) {
      const profile = buildScenarioProfile(`staff.${role.toLowerCase()}`)
      const email = uniqueEmail(role.toLowerCase())

      const createResponse = await request.post(`${API_BASE}/auth/staff-users`, {
        headers: { Authorization: `Bearer ${scenario.superToken}` },
        data: {
          email,
          password: 'Pass123.',
          firstName: profile.residentFirstName,
          lastName: profile.residentLastName,
          phoneNumber: '5551234567',
          role,
          condominiumId: scenario.condominiumId
        }
      })

      expect(createResponse.ok()).toBeTruthy()
      createdEmails.push({ email, role })
    }

    const listResponse = await request.get(`${API_BASE}/auth/staff-users?condominiumId=${scenario.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` }
    })

    expect(listResponse.ok()).toBeTruthy()
    const users = await listResponse.json()
    expect(Array.isArray(users)).toBeTruthy()

    for (const created of createdEmails) {
      const found = users.find((u: any) => u.email === created.email)
      expect(found).toBeTruthy()
      expect(found.defaultRole).toBe(created.role)
      expect(found.isActive).toBeTruthy()
    }
  })

  test('Create staff validates invalid email and phone', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'staff.ops.validation')

    const invalidEmail = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        email: 'correo-invalido',
        password: 'Pass123.',
        firstName: 'Invalid',
        lastName: 'Email',
        phoneNumber: '5551234567',
        role: 'Maintenance',
        condominiumId: scenario.condominiumId
      }
    })
    expect(invalidEmail.status()).toBe(400)

    const invalidPhone = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        email: uniqueEmail('invalid.phone'),
        password: 'Pass123.',
        firstName: 'Invalid',
        lastName: 'Phone',
        phoneNumber: '123',
        role: 'Cleaning',
        condominiumId: scenario.condominiumId
      }
    })
    expect(invalidPhone.status()).toBe(400)
  })

  test('SuperAdmin can update, deactivate, activate and delete staff user via API', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'staff.ops.crud')
    const originalProfile = buildScenarioProfile('staff.ops.crud.original')
    const updatedProfile = buildScenarioProfile('staff.ops.crud.updated')

    const email = uniqueEmail('crud.staff')

    const createResponse = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        email,
        password: 'Pass123.',
        firstName: originalProfile.residentFirstName,
        lastName: originalProfile.residentLastName,
        phoneNumber: '5551234567',
        role: 'Maintenance',
        condominiumId: scenario.condominiumId
      }
    })

    expect(createResponse.ok()).toBeTruthy()
    const createData = await createResponse.json()
    const staffId = createData.userId
    expect(staffId).toBeTruthy()

    const updateResponse = await request.put(`${API_BASE}/auth/staff-users/${staffId}`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        firstName: updatedProfile.residentFirstName,
        lastName: updatedProfile.residentLastName,
        phoneNumber: '5559998888',
        role: 'SecurityGuard',
        condominiumId: scenario.condominiumId
      }
    })
    expect(updateResponse.ok()).toBeTruthy()

    const deactivateResponse = await request.post(`${API_BASE}/auth/staff-users/${staffId}/deactivate`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` }
    })
    expect(deactivateResponse.ok()).toBeTruthy()

    const activateResponse = await request.post(`${API_BASE}/auth/staff-users/${staffId}/activate`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` }
    })
    expect(activateResponse.ok()).toBeTruthy()

    const deleteResponse = await request.delete(`${API_BASE}/auth/staff-users/${staffId}`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` }
    })
    expect(deleteResponse.ok()).toBeTruthy()
  })

  test('Assigned incidents are reflected as assigned tasks count in staff list', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'staff.ops.assignments')
    const staffProfile = buildScenarioProfile('staff.ops.assignments.target')
    const incidentProfile = buildScenarioProfile('staff.ops.assignments.incident')

    const email = uniqueEmail('assign.staff')
    const createStaffResponse = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        email,
        password: 'Pass123.',
        firstName: staffProfile.residentFirstName,
        lastName: staffProfile.residentLastName,
        phoneNumber: '5551112233',
        role: 'Cleaning',
        condominiumId: scenario.condominiumId
      }
    })
    expect(createStaffResponse.ok()).toBeTruthy()
    const staffData = await createStaffResponse.json()
    const staffId = staffData.userId

    const createIncidentResponse = await request.post(`${API_BASE}/incidents`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        reportedById: scenario.superUserId,
        title: `Incidencia operativa ${incidentProfile.readableLabel}`,
        description: 'Incidencia para validar asignación a personal operativo',
        type: 0,
        priority: 1,
        location: 'Lobby principal'
      }
    })
    expect(createIncidentResponse.status()).toBe(201)
    const incidentId = asId(await createIncidentResponse.json())

    const assignResponse = await request.post(`${API_BASE}/incidents/${incidentId}/assign`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        assigneeId: staffId
      }
    })
    expect(assignResponse.status()).toBe(204)

    const listResponse = await request.get(`${API_BASE}/auth/staff-users?condominiumId=${scenario.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` }
    })
    expect(listResponse.ok()).toBeTruthy()
    const users = await listResponse.json()
    const assignedStaff = users.find((u: any) => u.id === staffId)
    expect(assignedStaff).toBeTruthy()
    expect(assignedStaff.assignedTasksCount).toBeGreaterThanOrEqual(1)
  })

  test('Anonymous user cannot create staff users', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/staff-users`, {
      data: {
        email: uniqueEmail('anon'),
        password: 'Pass123.',
        firstName: 'Anon',
        lastName: 'User',
        role: 'Cleaning',
        condominiumId: '00000000-0000-0000-0000-000000000000'
      }
    })

    expect(response.status()).toBe(401)
  })

  test('SuperAdmin can use the staff UI to register operational personnel', async ({ page, request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'staff.ops.ui')
    const profile = buildScenarioProfile('staff.ops.ui.cleaning')

    await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    await page.goto('/superadmin/staff')

    await expect(page.getByRole('heading', { name: 'Personal Operativo' })).toBeVisible()

    const topCondoSelect = page.locator('select').first()
    await topCondoSelect.selectOption(scenario.condominiumId)

    const email = uniqueEmail('ui.cleaning')
  await page.fill('input[placeholder="Nombre"]', profile.residentFirstName)
  await page.fill('input[placeholder="Apellido"]', profile.residentLastName)
    await page.fill('input[placeholder="Correo"]', email)
    await page.fill('input[placeholder="Teléfono"]', '5557654321')
    await page.fill('input[placeholder="Contraseña temporal"]', 'Pass123.')

    const form = page.locator('form').first()
    await form.locator('select').first().selectOption('Cleaning')

    const formSelects = form.locator('select')
    if (await formSelects.count() > 1) {
      await formSelects.nth(1).selectOption(scenario.condominiumId)
    }

    await page.click('button:has-text("Crear usuario")')

    await expect(page.locator('text=Personal operativo creado correctamente')).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=${email}`)).toBeVisible({ timeout: 10000 })
  })
})
