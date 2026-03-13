import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, loginUI, registerConfirmedUser, uniqueEmail, unwrapData } from './helpers/auth'
import { createAdminCondominiumScenario, asId } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { runSql } from './helpers/sql'

async function createAccountantUser(request: APIRequestContext, superToken: string, condominiumId: string): Promise<{ email: string; password: string }> {
  const profile = buildScenarioProfile('accountant.ops')
  const email = uniqueEmail('accountant.ops')
  const { password } = await registerConfirmedUser(request, {
    email,
    firstName: profile.residentFirstName,
    lastName: profile.residentLastName,
    role: 'accountant'
  })

  return { email, password }
}

async function grantAccountantPermissions(request: APIRequestContext, superToken: string, userId: string) {
  const permissions = [
    'billing.view',
    'billing.create_charges',
    'reports.financial'
  ]

  for (const code of permissions) {
    const grant = await request.post(`${API_BASE}/permissions/user/${userId}/grant`, {
      headers: { Authorization: `Bearer ${superToken}` },
      data: { permissionCode: code }
    })
    expect(grant.ok()).toBeTruthy()
  }
}

function assignAccountantToCondominium(userId: string, condominiumId: string) {
  runSql(`
IF NOT EXISTS (
    SELECT 1
    FROM [auth].[UserCondominiumRoles]
    WHERE [UserId] = '${userId}'
      AND [CondominiumId] = '${condominiumId}'
      AND [Role] = 8
)
BEGIN
    INSERT INTO [auth].[UserCondominiumRoles] ([CondominiumId], [Role], [AssignedAt], [UserId])
    VALUES ('${condominiumId}', 8, SYSUTCDATETIME(), '${userId}')
END
`)
}

test.describe('Accountant dashboard KPIs', () => {
  test('API endpoints for accountant KPIs should return consistent accounting data', async ({ request }) => {
    const superLogin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const scenario = await createAdminCondominiumScenario(request, 'accountant.dashboard.api')
    const apiProfile = buildScenarioProfile('accountant.dashboard.api.charge')

    const accountant = await createAccountantUser(request, superLogin.token, scenario.condominiumId)
    const accountantLogin = await loginAPI(request, accountant.email, accountant.password)
    assignAccountantToCondominium(accountantLogin.userId!, scenario.condominiumId)
    await grantAccountantPermissions(request, superLogin.token, accountantLogin.userId!)

    const now = new Date()
    const chargeAmount = 875
    const createChargeResponse = await request.post(`${API_BASE}/billing/charges`, {
      headers: { Authorization: `Bearer ${accountantLogin.token}` },
      data: {
        condominiumId: scenario.condominiumId,
        unitId: scenario.unitId,
        concept: `Cuota de tablero ${apiProfile.readableLabel}`,
        feeType: 0,
        amount: chargeAmount,
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        billingPeriodMonth: now.getMonth() + 1,
        billingPeriodYear: now.getFullYear(),
        applyLateFee: false,
        lateFeePercentage: null
      }
    })
    expect(createChargeResponse.status()).toBe(201)
    const chargeId = asId(await createChargeResponse.json())

    const paymentAmount = 300
    const createPaymentResponse = await request.post(`${API_BASE}/billing/payments`, {
      headers: { Authorization: `Bearer ${accountantLogin.token}` },
      data: {
        chargeId,
        amount: paymentAmount,
        paymentMethod: 1,
        paymentDate: now.toISOString(),
        receivedById: accountantLogin.userId,
        referenceNumber: `TAB-${Date.now().toString().slice(-4)}`,
        notes: 'Pago parcial para tablero contable'
      }
    })
    expect(createPaymentResponse.ok()).toBeTruthy()
    const paymentId = asId(await createPaymentResponse.json())

    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    const responses = await Promise.all([
      request.get(`${API_BASE}/billing/summary/${scenario.condominiumId}?month=${month}&year=${year}`, { headers: { Authorization: `Bearer ${accountantLogin.token}` } }),
      request.get(`${API_BASE}/billing/payments/pending/${scenario.condominiumId}`, { headers: { Authorization: `Bearer ${accountantLogin.token}` } }),
      request.get(`${API_BASE}/reports/financial/${scenario.condominiumId}?startDate=${startDate}&endDate=${endDate}`, { headers: { Authorization: `Bearer ${accountantLogin.token}` } })
    ])

    const [summaryResponse, pendingResponse, reportResponse] = responses

    expect(summaryResponse.status()).toBe(200)
    const summary = unwrapData<any>(await summaryResponse.json())
    expect(summary).toBeTruthy()
    expect(Number(summary.totalCharged ?? 0)).toBeGreaterThanOrEqual(chargeAmount)
    expect(Number(summary.totalCollected ?? 0)).toBeGreaterThanOrEqual(paymentAmount)
    expect(Number(summary.totalPending ?? 0)).toBeGreaterThan(0)

    expect(pendingResponse.status()).toBe(200)
    const pendingPayments = unwrapData<any[]>(await pendingResponse.json())
    expect(Array.isArray(pendingPayments)).toBeTruthy()
    expect(pendingPayments.some(payment => payment.id === paymentId && payment.amount === paymentAmount)).toBeTruthy()

    expect(reportResponse.status()).toBe(200)
    const financialReport = unwrapData<any>(await reportResponse.json())
    expect(financialReport).toBeTruthy()
    expect(Number(financialReport.totalCharged ?? 0)).toBeGreaterThanOrEqual(chargeAmount)
    expect(Array.isArray(financialReport.byPaymentMethod)).toBeTruthy()
  })

  test('Frontend should render accountant dashboard with backend-fed KPIs', async ({ page, request }) => {
    const superLogin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    expect(superLogin.userId).toBeTruthy()
    const scenario = await createAdminCondominiumScenario(request, 'accountant.dashboard.ui')
    const uiProfile = buildScenarioProfile('accountant.dashboard.ui.charge')

    const accountant = await createAccountantUser(request, superLogin.token, scenario.condominiumId)
    const accountantLogin = await loginAPI(request, accountant.email, accountant.password)
    expect(accountantLogin.userId).toBeTruthy()
    assignAccountantToCondominium(accountantLogin.userId!, scenario.condominiumId)
    await grantAccountantPermissions(request, superLogin.token, accountantLogin.userId!)

    const seedChargeResponse = await request.post(`${API_BASE}/billing/charges`, {
      headers: { Authorization: `Bearer ${accountantLogin.token}` },
      data: {
        condominiumId: scenario.condominiumId,
        unitId: scenario.unitId,
        concept: `Cuota del panel ${uiProfile.readableLabel}`,
        feeType: 0,
        amount: 640,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        billingPeriodMonth: new Date().getMonth() + 1,
        billingPeriodYear: new Date().getFullYear(),
        applyLateFee: false,
        lateFeePercentage: null
      }
    })
    expect(seedChargeResponse.status()).toBe(201)

    await loginUI(page, accountant.email, accountant.password, /\/accountant(\/|$)/)

    await page.goto('/accountant/dashboard')
    await expect(page.getByRole('heading', { name: 'Panel de Contabilidad' })).toBeVisible()
    await expect(page.getByText('Ingresos del Mes')).toBeVisible()
    await expect(page.getByText('Pendientes de Cobro')).toBeVisible()
    await expect(page.getByText('Cargos Generados')).toBeVisible()
    await expect(page.getByText('Tasa de Cobro')).toBeVisible()
    await expect(page.getByText('Resumen Mensual')).toBeVisible()
    await expect(page.getByText('Pagos Pendientes por Verificar')).toBeVisible()
  })
})
