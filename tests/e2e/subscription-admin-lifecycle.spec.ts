import { test, expect } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginUI } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'

test.describe('Suscripción del administrador', () => {
  test('cambia de plan, el bloqueo por cancelación se levanta al condonar, y la tarjeta inválida no cobra', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'subscription.lifecycle')
    const headers = { Authorization: `Bearer ${scenario.superToken}` }

    const currentResponse = await request.get(`${API_BASE}/Subscriptions/user/${scenario.adminUserId}`, { headers })
    expect(currentResponse.ok()).toBeTruthy()
    const current = await currentResponse.json()
    const subscriptionId = current.id as string
    expect(subscriptionId).toBeTruthy()

    const plansResponse = await request.get(`${API_BASE}/SubscriptionPlans`, { headers })
    expect(plansResponse.ok()).toBeTruthy()
    const plans = await plansResponse.json()
    const planList = Array.isArray(plans) ? plans : plans.data || plans.items || []
    const otherPlan = planList.find((plan: { id: string }) => plan.id !== current.plan?.id) ?? planList[0]
    expect(otherPlan?.id).toBeTruthy()

    const changed = await request.post(`${API_BASE}/Subscriptions/${subscriptionId}/change-plan`, {
      headers,
      data: { planId: otherPlan.id }
    })
    expect(changed.ok()).toBeTruthy()
    const changedBody = await changed.json()
    expect(changedBody.plan?.id ?? changedBody.Plan?.Id).toBe(otherPlan.id)

    const configResponse = await request.get(`${API_BASE}/Subscriptions/openpay/config`, { headers })
    expect(configResponse.ok()).toBeTruthy()
    const config = await configResponse.json()
    const card = await request.post(`${API_BASE}/Subscriptions/${subscriptionId}/payments/openpay/card`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        tokenId: 'tk_spec_invalido',
        deviceSessionId: 'device_spec_invalido',
        monthsPaid: 1,
        customerEmail: scenario.adminEmail,
        customerAddressLine1: 'Av. Operaciones 100',
        customerPostalCode: '03100',
        customerCity: 'Ciudad de Mexico',
        customerState: 'Ciudad de Mexico'
      }
    })
    const cardBody = await card.json()
    if (config.enabled) {
      expect(card.status()).toBe(400)
      expect(cardBody.message ?? cardBody.Message).toMatch(/OpenPay/i)
    } else {
      expect(card.status()).toBe(503)
    }

    const cancelled = await request.post(`${API_BASE}/Subscriptions/${subscriptionId}/change-status`, {
      headers,
      data: { newStatus: 'cancel', reason: 'Spec de bloqueo' }
    })
    expect(cancelled.ok()).toBeTruthy()

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await expect(page.getByText('Tu suscripción ha sido cancelada')).toBeVisible({ timeout: 15000 })

    const condoned = await request.post(`${API_BASE}/Subscriptions/${subscriptionId}/condone`, {
      headers,
      data: { months: 1, reason: 'Spec de condonación' }
    })
    expect(condoned.ok()).toBeTruthy()
    expect((await condoned.json()).status).toMatch(/Active|Activa/)

    await page.goto('/admin/dashboard')
    await expect(page.getByText('Tu suscripción ha sido cancelada')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Residentes' })).toBeVisible({ timeout: 15000 })
  })

  test('el superadmin cambia el plan, cancela y condona desde la pantalla', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'subscription.screen')

    await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, /\/superadmin(\/|$)/)
    await page.goto('/superadmin/subscriptions')
    await expect(page.getByRole('heading', { name: 'Gestión de Suscripciones' })).toBeVisible()
    await page.getByPlaceholder('Buscar por nombre, email o plan...').fill(scenario.adminEmail)
    const row = page.locator('tr').filter({ hasText: scenario.adminEmail })
    await expect(row).toBeVisible({ timeout: 15000 })

    await row.getByTitle('Cambiar plan').click()
    const planDialog = page.locator('.fixed').filter({ has: page.getByRole('heading', { name: 'Cambiar plan' }) })
    const planSelect = planDialog.locator('select')
    const planOptions = planSelect.locator('option')
    await expect(planOptions).not.toHaveCount(1)
    const rowText = await row.innerText()
    const optionCount = await planOptions.count()
    let planIndex = 1
    for (let index = 1; index < optionCount; index++) {
      const label = ((await planOptions.nth(index).textContent()) || '').trim()
      if (label && !rowText.includes(label)) {
        planIndex = index
        break
      }
    }
    await planSelect.selectOption({ index: planIndex })
    const chosenPlan = ((await planSelect.locator('option:checked').textContent()) || '').trim()
    await planDialog.getByRole('button', { name: 'Cambiar plan' }).click()
    await expect(page.getByText('Plan actualizado')).toBeVisible({ timeout: 15000 })
    await expect(row.getByText(chosenPlan)).toBeVisible()

    await row.getByTitle('Cambiar Estado').click()
    const statusDialog = page.locator('.fixed').filter({ hasText: 'Cambiar Estado' })
    await statusDialog.locator('select').selectOption('cancel')
    await statusDialog.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Estado actualizado')).toBeVisible({ timeout: 15000 })
    await expect(row.getByText('Cancelada')).toBeVisible()

    await row.getByTitle('Condonar').click()
    const condoneDialog = page.locator('.fixed').filter({ hasText: 'Condonar Pago' })
    await condoneDialog.getByRole('button', { name: 'Condonar' }).click()
    await expect(page.getByText(/Pago condonado/)).toBeVisible({ timeout: 15000 })
    await expect(row.getByText('Activa')).toBeVisible()

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await expect(page.getByText('Tu suscripción ha sido cancelada')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Residentes' })).toBeVisible({ timeout: 15000 })
  })
})
