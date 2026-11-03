import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, registerConfirmedUser, unwrapData, uniqueEmail } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'
import { ensureCondominiumRole } from './helpers/sql'

type BillingScenario = {
  superToken: string
  condominiumId: string
  unitId: string
  accountantToken: string
  accountantUserId: string
}

function assignAccountantToCondominium(userId: string, condominiumId: string) {
  ensureCondominiumRole(userId, condominiumId, 8)
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
      ?? record.chargeId
      ?? record.ChargeId

    if (typeof candidate === 'string') return candidate
  }

  throw new Error(`No se pudo extraer un id del payload: ${JSON.stringify(payload)}`)
}

async function createBillingScenario(request: APIRequestContext): Promise<BillingScenario> {
  const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
  const adminProfile = buildScenarioProfile('billing.ops.admin')
  const accountantProfile = buildScenarioProfile('billing.ops.accountant')
  const condominiumProfile = buildScenarioProfile('billing.ops.condominium')

  const admin = await registerConfirmedUser(request, {
    email: uniqueEmail('billing.ops.admin'),
    firstName: adminProfile.adminFirstName,
    lastName: adminProfile.adminLastName,
    role: 'admin'
  })

  const accountant = await registerConfirmedUser(request, {
    email: uniqueEmail('billing.ops.accountant'),
    firstName: accountantProfile.residentFirstName,
    lastName: accountantProfile.residentLastName,
    role: 'accountant'
  })

  const createCondominium = await request.post(`${API_BASE}/condominiums`, {
    headers: { Authorization: `Bearer ${superadmin.token}` },
    data: {
      userId: admin.userId,
      name: condominiumProfile.condominiumName,
      description: 'Escenario automatizado de operaciones contables',
      street: 'Av. Contabilidad 100',
      city: 'Ciudad de Mexico',
      state: 'Ciudad de Mexico',
      postalCode: '03100',
      country: 'Mexico',
      neighborhood: 'Narvarte',
      buildings: [
        {
          name: condominiumProfile.buildingName,
          type: 'vertical',
          section: 'A',
          totalFloors: 2,
          startsAtGroundFloor: true,
          units: [
            {
              unitNumber: condominiumProfile.unitNumber,
              floor: 1,
              isCommercial: false,
              area: 90,
              bedrooms: 2,
              bathrooms: 2,
              monthlyMaintenanceFee: 1500
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

  const accountantLogin = await loginAPI(request, accountant.email, accountant.password)
  assignAccountantToCondominium(accountantLogin.userId, condominiumId)

  const permissions = [
    'billing.view',
    'billing.create_charges',
    'billing.record_payments',
    'billing.export',
    'billing.view_all_units',
    'reports.financial'
  ]

  for (const permissionCode of permissions) {
    const grant = await request.post(`${API_BASE}/permissions/user/${accountantLogin.userId}/grant`, {
      headers: { Authorization: `Bearer ${superadmin.token}` },
      data: { permissionCode }
    })
    expect(grant.ok()).toBeTruthy()
  }

  return {
    superToken: superadmin.token,
    condominiumId,
    unitId: unitId!,
    accountantToken: accountantLogin.token,
    accountantUserId: accountantLogin.userId
  }
}

async function createCharge(
  request: APIRequestContext,
  scenario: BillingScenario,
  concept: string,
  amount: number,
  dueDate: Date,
  applyLateFee: boolean = false,
  lateFeePercentage?: number
): Promise<string> {
  const now = new Date()
  const createChargeResponse = await request.post(`${API_BASE}/billing/charges`, {
    headers: { Authorization: `Bearer ${scenario.accountantToken}` },
    data: {
      condominiumId: scenario.condominiumId,
      unitId: scenario.unitId,
      concept,
      feeType: 0,
      amount,
      dueDate: dueDate.toISOString(),
      billingPeriodMonth: now.getMonth() + 1,
      billingPeriodYear: now.getFullYear(),
      applyLateFee,
      lateFeePercentage: lateFeePercentage ?? null
    }
  })

  expect(createChargeResponse.status()).toBe(201)
  return asId(await createChargeResponse.json())
}

async function getBillingSummary(request: APIRequestContext, scenario: BillingScenario) {
  const now = new Date()
  const response = await request.get(
    `${API_BASE}/billing/summary/${scenario.condominiumId}?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
    { headers: { Authorization: `Bearer ${scenario.accountantToken}` } }
  )

  expect(response.ok()).toBeTruthy()
  return await response.json()
}

async function getFinancialReport(request: APIRequestContext, scenario: BillingScenario, startDate: Date, endDate: Date) {
  const response = await request.get(
    `${API_BASE}/reports/financial/${scenario.condominiumId}?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`,
    { headers: { Authorization: `Bearer ${scenario.accountantToken}` } }
  )

  expect(response.ok()).toBeTruthy()
  return await response.json()
}

async function getUnitBalance(request: APIRequestContext, scenario: BillingScenario) {
  const response = await request.get(`${API_BASE}/billing/balance/unit/${scenario.unitId}`, {
    headers: { Authorization: `Bearer ${scenario.accountantToken}` }
  })

  expect(response.ok()).toBeTruthy()
  return await response.json()
}

async function getOverdueCharges(request: APIRequestContext, scenario: BillingScenario) {
  const response = await request.get(`${API_BASE}/billing/charges/overdue/${scenario.condominiumId}`, {
    headers: { Authorization: `Bearer ${scenario.accountantToken}` }
  })

  const responseBody = await response.text()
  expect(response.ok(), `GET overdue charges failed with ${response.status()}: ${responseBody}`).toBeTruthy()
  return JSON.parse(responseBody)
}

async function getPendingPayments(request: APIRequestContext, scenario: BillingScenario) {
  const response = await request.get(`${API_BASE}/billing/payments/pending/${scenario.condominiumId}`, {
    headers: { Authorization: `Bearer ${scenario.accountantToken}` }
  })

  expect(response.ok()).toBeTruthy()
  return await response.json()
}

async function getChargeDetail(request: APIRequestContext, scenario: BillingScenario, chargeId: string) {
  const response = await request.get(`${API_BASE}/billing/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${scenario.accountantToken}` }
  })

  expect(response.ok()).toBeTruthy()
  return await response.json()
}

test.describe('Billing business operations', () => {
  test('keeps charges, payments, delinquency and financial reports consistent through the full accounting lifecycle', async ({ request }) => {
    const scenario = await createBillingScenario(request)
    const billingProfile = buildScenarioProfile('billing.ops.lifecycle')
    const now = new Date()
    const reportStart = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
    const reportEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)

    const overdueChargeId = await createCharge(
      request,
      scenario,
      `Cuota vencida ${billingProfile.readableLabel}`,
      1000,
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      true,
      10
    )

    const applyLateFee = await request.post(`${API_BASE}/billing/charges/${overdueChargeId}/apply-late-fee`, {
      headers: { Authorization: `Bearer ${scenario.accountantToken}` }
    })
    expect(applyLateFee.status()).toBe(204)

    const partialChargeId = await createCharge(
      request,
      scenario,
      `Cuota parcial ${billingProfile.unitNumber}`,
      600,
      new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    )

    const partialPaymentResponse = await request.post(`${API_BASE}/billing/payments`, {
      headers: { Authorization: `Bearer ${scenario.accountantToken}` },
      data: {
        chargeId: partialChargeId,
        amount: 200,
        paymentMethod: 1,
        paymentDate: now.toISOString(),
        receivedById: scenario.accountantUserId,
        referenceNumber: `PAR-${billingProfile.unitNumber.replace('-', '')}`,
        notes: 'Pago parcial para conciliacion contable'
      }
    })
    expect(partialPaymentResponse.ok()).toBeTruthy()
    const partialPaymentId = asId(await partialPaymentResponse.json())

    const refundedChargeId = await createCharge(
      request,
      scenario,
      `Cuota revertida ${billingProfile.condominiumName}`,
      500,
      new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)
    )

    const refundablePaymentResponse = await request.post(`${API_BASE}/billing/payments`, {
      headers: { Authorization: `Bearer ${scenario.accountantToken}` },
      data: {
        chargeId: refundedChargeId,
        amount: 500,
        paymentMethod: 0,
        paymentDate: now.toISOString(),
        receivedById: scenario.accountantUserId,
        referenceNumber: `REV-${billingProfile.unitNumber.replace('-', '')}`,
        notes: 'Pago completo que despues se revierte'
      }
    })
    expect(refundablePaymentResponse.ok()).toBeTruthy()
    const refundablePaymentId = asId(await refundablePaymentResponse.json())

    const verifyPayment = await request.post(`${API_BASE}/billing/payments/${refundablePaymentId}/verify`, {
      headers: { Authorization: `Bearer ${scenario.accountantToken}` },
      data: { verifiedById: scenario.accountantUserId }
    })
    expect(verifyPayment.status()).toBe(204)

    const refundPayment = await request.post(`${API_BASE}/billing/payments/${refundablePaymentId}/refund`, {
      headers: { Authorization: `Bearer ${scenario.accountantToken}` },
      data: {
        reason: 'Reverso por conciliacion bancaria',
        refundedById: scenario.accountantUserId
      }
    })
    expect(refundPayment.status()).toBe(204)

    const forgivenChargeId = await createCharge(
      request,
      scenario,
      `Cuota condonada ${billingProfile.buildingName}`,
      300,
      new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
    )

    const forgiveCharge = await request.post(`${API_BASE}/billing/charges/${forgivenChargeId}/forgive`, {
      headers: { Authorization: `Bearer ${scenario.accountantToken}` },
      data: { reason: 'Ajuste aprobado por administracion' }
    })
    expect(forgiveCharge.status()).toBe(204)

    const overdueCharge = await getChargeDetail(request, scenario, overdueChargeId)
    expect(overdueCharge.amount).toBe(1100)
    expect(overdueCharge.lateFeeAmount).toBe(100)
    expect(overdueCharge.balance).toBe(1100)

    const partialCharge = await getChargeDetail(request, scenario, partialChargeId)
    expect(partialCharge.paidAmount).toBe(200)
    expect(partialCharge.balance).toBe(400)
    expect(partialCharge.status).toBe(1)

    const refundedCharge = await getChargeDetail(request, scenario, refundedChargeId)
    expect(refundedCharge.paidAmount).toBe(0)
    expect(refundedCharge.balance).toBe(500)
    expect(refundedCharge.status).toBe(0)
    expect(refundedCharge.payments).toHaveLength(1)
    expect(refundedCharge.payments[0].isRefunded).toBe(true)

    const forgivenCharge = await getChargeDetail(request, scenario, forgivenChargeId)
    expect(forgivenCharge.status).toBe(5)

    const pendingPayments = await getPendingPayments(request, scenario)
    expect(pendingPayments).toHaveLength(1)
    expect(pendingPayments[0].id).toBe(partialPaymentId)
    expect(pendingPayments[0].amount).toBe(200)

    const overdueCharges = await getOverdueCharges(request, scenario)
    expect(overdueCharges).toHaveLength(1)
    expect(overdueCharges[0].id).toBe(overdueChargeId)
    expect(overdueCharges[0].amount).toBe(1100)

    const unitBalance = await getUnitBalance(request, scenario)
    expect(unitBalance.totalPaid).toBe(200)
    expect(unitBalance.balance).toBe(2000)
    expect(unitBalance.pendingCharges).toBe(2)
    expect(unitBalance.overdueCharges).toBe(1)

    const summary = await getBillingSummary(request, scenario)
    expect(summary.totalCharged).toBe(2500)
    expect(summary.totalCollected).toBe(200)
    expect(summary.totalPending).toBe(900)
    expect(summary.totalOverdue).toBe(1100)
    expect(summary.totalCharges).toBe(4)
    expect(summary.paidCharges).toBe(0)
    expect(summary.pendingCharges).toBe(2)
    expect(summary.overdueCharges).toBe(1)
    expect(summary.collectionRate).toBe(8)

    const financialReport = await getFinancialReport(request, scenario, reportStart, reportEnd)
    expect(financialReport.totalCharged).toBe(2500)
    expect(financialReport.totalCollected).toBe(200)
    expect(financialReport.totalPending).toBe(900)
    expect(financialReport.totalOverdue).toBe(1100)
    expect(financialReport.totalCharges).toBe(4)
    expect(financialReport.paidCharges).toBe(0)
    expect(financialReport.pendingCharges).toBe(2)
    expect(financialReport.overdueCharges).toBe(1)
    expect(financialReport.unverifiedPayments).toBe(1)

    const transferBreakdown = financialReport.byPaymentMethod.find((entry: any) => entry.method === 'Transferencia Bancaria')
    expect(transferBreakdown).toBeTruthy()
    expect(transferBreakdown.amount).toBe(200)
    expect(transferBreakdown.count).toBe(1)
    expect(financialReport.byPaymentMethod.some((entry: any) => entry.method === 'Efectivo')).toBe(false)

    expect(financialReport.delinquentUnits).toHaveLength(1)
    expect(financialReport.delinquentUnits[0].overdueAmount).toBe(1100)
    expect(financialReport.delinquentUnits[0].overdueCharges).toBe(1)
    expect(financialReport.delinquentUnits[0].daysOverdue).toBeGreaterThanOrEqual(5)

    expect(summary.totalPending + summary.totalOverdue).toBe(unitBalance.balance)
  })
})