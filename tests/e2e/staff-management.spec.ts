import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

const API_BASE = 'http://localhost:5001/api'
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

async function getFirstCondominiumId(request: APIRequestContext, token: string): Promise<string | null> {
  const response = await request.get(`${API_BASE}/condominiums`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const condominiums = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
  return condominiums.length > 0 ? (condominiums[0].id as string) : null
}

async function loginUI(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/superadmin(\/|$)/, { timeout: 15000 })
}

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}@e2e.local`
}

test.describe('Staff Management E2E', () => {
  test('SuperAdmin can create Maintenance, Security and Cleaning staff via API and list them', async ({ request }) => {
    const { token } = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const condominiumId = await getFirstCondominiumId(request, token)

    test.skip(!condominiumId, 'No hay condominios para ejecutar esta prueba')

    const roles: Array<'Maintenance' | 'SecurityGuard' | 'Cleaning'> = ['Maintenance', 'SecurityGuard', 'Cleaning']
    const createdEmails: Array<{ email: string; role: string }> = []

    for (const role of roles) {
      const email = uniqueEmail(role.toLowerCase())

      const createResponse = await request.post(`${API_BASE}/auth/staff-users`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          email,
          password: 'Pass123.',
          firstName: `E2E${role}`,
          lastName: 'Staff',
          phoneNumber: '5551234567',
          role,
          condominiumId
        }
      })

      expect(createResponse.ok()).toBeTruthy()
      createdEmails.push({ email, role })
    }

    const listResponse = await request.get(`${API_BASE}/auth/staff-users?condominiumId=${condominiumId}`, {
      headers: { Authorization: `Bearer ${token}` }
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
    const { token } = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const condominiumId = await getFirstCondominiumId(request, token)

    test.skip(!condominiumId, 'No hay condominios para ejecutar esta prueba')

    const invalidEmail = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        email: 'correo-invalido',
        password: 'Pass123.',
        firstName: 'Invalid',
        lastName: 'Email',
        phoneNumber: '5551234567',
        role: 'Maintenance',
        condominiumId
      }
    })
    expect(invalidEmail.status()).toBe(400)

    const invalidPhone = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        email: uniqueEmail('invalid.phone'),
        password: 'Pass123.',
        firstName: 'Invalid',
        lastName: 'Phone',
        phoneNumber: '123',
        role: 'Cleaning',
        condominiumId
      }
    })
    expect(invalidPhone.status()).toBe(400)
  })

  test('SuperAdmin can update, deactivate, activate and delete staff user via API', async ({ request }) => {
    const { token } = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const condominiumId = await getFirstCondominiumId(request, token)

    test.skip(!condominiumId, 'No hay condominios para ejecutar esta prueba')

    const email = uniqueEmail('crud.staff')

    const createResponse = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        email,
        password: 'Pass123.',
        firstName: 'CRUD',
        lastName: 'Staff',
        phoneNumber: '5551234567',
        role: 'Maintenance',
        condominiumId
      }
    })

    expect(createResponse.ok()).toBeTruthy()
    const createData = await createResponse.json()
    const staffId = createData.userId
    expect(staffId).toBeTruthy()

    const updateResponse = await request.put(`${API_BASE}/auth/staff-users/${staffId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        firstName: 'CRUD-UPDATED',
        lastName: 'Staff-UPDATED',
        phoneNumber: '5559998888',
        role: 'SecurityGuard',
        condominiumId
      }
    })
    expect(updateResponse.ok()).toBeTruthy()

    const deactivateResponse = await request.post(`${API_BASE}/auth/staff-users/${staffId}/deactivate`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(deactivateResponse.ok()).toBeTruthy()

    const activateResponse = await request.post(`${API_BASE}/auth/staff-users/${staffId}/activate`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(activateResponse.ok()).toBeTruthy()

    const deleteResponse = await request.delete(`${API_BASE}/auth/staff-users/${staffId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(deleteResponse.ok()).toBeTruthy()
  })

  test('Assigned incidents are reflected as assigned tasks count in staff list', async ({ request }) => {
    const { token, userId } = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const condominiumId = await getFirstCondominiumId(request, token)

    test.skip(!condominiumId, 'No hay condominios para ejecutar esta prueba')

    const email = uniqueEmail('assign.staff')
    const createStaffResponse = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        email,
        password: 'Pass123.',
        firstName: 'Assign',
        lastName: 'Target',
        phoneNumber: '5551112233',
        role: 'Cleaning',
        condominiumId
      }
    })
    expect(createStaffResponse.ok()).toBeTruthy()
    const staffData = await createStaffResponse.json()
    const staffId = staffData.userId

    const createIncidentResponse = await request.post(`${API_BASE}/incidents`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        condominiumId,
        reportedById: userId,
        title: `Incidencia de prueba ${Date.now()}`,
        description: 'Incidencia para validar asignación a personal operativo',
        type: 0,
        priority: 1,
        location: 'Lobby principal'
      }
    })
    expect(createIncidentResponse.status()).toBe(201)
    const incidentId = await createIncidentResponse.json()

    const assignResponse = await request.post(`${API_BASE}/incidents/${incidentId}/assign`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        assigneeId: staffId
      }
    })
    expect(assignResponse.status()).toBe(204)

    const listResponse = await request.get(`${API_BASE}/auth/staff-users?condominiumId=${condominiumId}`, {
      headers: { Authorization: `Bearer ${token}` }
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
    const { token } = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const condominiumId = await getFirstCondominiumId(request, token)

    test.skip(!condominiumId, 'No hay condominios para ejecutar esta prueba')

    await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    await page.goto('/superadmin/staff')

    await expect(page.getByRole('heading', { name: 'Personal Operativo' })).toBeVisible()

    const topCondoSelect = page.locator('select').first()
    await topCondoSelect.selectOption(condominiumId!)

    const email = uniqueEmail('ui.cleaning')
    await page.fill('input[placeholder="Nombre"]', 'UI')
    await page.fill('input[placeholder="Apellido"]', 'Cleaning')
    await page.fill('input[placeholder="Correo"]', email)
    await page.fill('input[placeholder="Teléfono"]', '5557654321')
    await page.fill('input[placeholder="Contraseña temporal"]', 'Pass123.')

    const form = page.locator('form').first()
    await form.locator('select').first().selectOption('Cleaning')

    const formSelects = form.locator('select')
    if (await formSelects.count() > 1) {
      await formSelects.nth(1).selectOption(condominiumId!)
    }

    await page.click('button:has-text("Crear usuario")')

    await expect(page.locator('text=Personal operativo creado correctamente')).toBeVisible({ timeout: 10000 })
    await expect(page.locator(`text=${email}`)).toBeVisible({ timeout: 10000 })
  })
})
