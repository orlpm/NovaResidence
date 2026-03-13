import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, loginUI, registerConfirmedUser, unwrapData, uniqueEmail } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'
import { createAdminCondominiumScenario, type AdminCondominiumScenario } from './helpers/condominium'

type ResidentScenario = {
	residentId: string
	residentUserId: string
	email: string
	password: string
}

function asId(payload: unknown): string {
	if (typeof payload === 'string') return payload
	if (payload && typeof payload === 'object') {
		const candidate = (payload as Record<string, unknown>).id
			?? (payload as Record<string, unknown>).Id
			?? (payload as Record<string, unknown>).condominiumId
			?? (payload as Record<string, unknown>).CondominiumId
			?? (payload as Record<string, unknown>).paymentId
			?? (payload as Record<string, unknown>).PaymentId
		if (typeof candidate === 'string') return candidate
	}

	throw new Error(`No se pudo extraer un id del payload: ${JSON.stringify(payload)}`)
}

async function createResidentScenario(
	request: APIRequestContext,
	superToken: string,
	unitId: string
): Promise<ResidentScenario> {
	const profile = buildScenarioProfile('billing.resident')
	const email = uniqueEmail('billing.resident')
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

async function createCharge(
	request: APIRequestContext,
	token: string,
	scenario: AdminCondominiumScenario,
	concept: string,
	amount: number
): Promise<{ chargeId: string; dueDate: Date; month: number; year: number }> {
	const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
	const month = dueDate.getMonth() + 1
	const year = dueDate.getFullYear()

	const createChargeResponse = await request.post(`${API_BASE}/billing/charges`, {
		headers: { Authorization: `Bearer ${token}` },
		data: {
			condominiumId: scenario.condominiumId,
			unitId: scenario.unitId,
			concept,
			feeType: 0,
			amount,
			dueDate: dueDate.toISOString(),
			billingPeriodMonth: month,
			billingPeriodYear: year,
			applyLateFee: false
		}
	})

	expect(createChargeResponse.status()).toBe(201)

	return {
		chargeId: asId(await createChargeResponse.json()),
		dueDate,
		month,
		year
	}
}

async function getPendingPayments(request: APIRequestContext, token: string, condominiumId: string) {
	const response = await request.get(`${API_BASE}/billing/payments/pending/${condominiumId}`, {
		headers: { Authorization: `Bearer ${token}` }
	})
	expect(response.ok()).toBeTruthy()
	return await response.json()
}

async function getUnitBalance(request: APIRequestContext, token: string, unitId: string) {
	const response = await request.get(`${API_BASE}/billing/balance/unit/${unitId}`, {
		headers: { Authorization: `Bearer ${token}` }
	})
	expect(response.ok()).toBeTruthy()
	return await response.json()
}

async function getBillingSummary(
	request: APIRequestContext,
	token: string,
	condominiumId: string,
	month: number,
	year: number
) {
	const response = await request.get(`${API_BASE}/billing/summary/${condominiumId}?month=${month}&year=${year}`, {
		headers: { Authorization: `Bearer ${token}` }
	})
	expect(response.ok()).toBeTruthy()
	return await response.json()
}

async function getChargeDetail(request: APIRequestContext, token: string, chargeId: string) {
	const response = await request.get(`${API_BASE}/billing/charges/${chargeId}`, {
		headers: { Authorization: `Bearer ${token}` }
	})
	expect(response.ok()).toBeTruthy()
	return await response.json()
}

async function openAdminBillingAsCondoAdmin(page: Page, scenario: AdminCondominiumScenario) {
	await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, /\/superadmin(\/|$)/)

	await page.evaluate(({ adminUserId, condominiumId }) => {
		const raw = window.localStorage.getItem('auth-storage')
		if (!raw) return

		const parsed = JSON.parse(raw)
		parsed.state = parsed.state || {}
		parsed.state.user = {
			...(parsed.state.user || {}),
			id: adminUserId,
			role: 'admin',
			defaultRole: 'Admin',
			condominiumId
		}
		parsed.state.isAuthenticated = true
		window.localStorage.setItem('auth-storage', JSON.stringify(parsed))
	}, {
		adminUserId: scenario.adminUserId,
		condominiumId: scenario.condominiumId
	})

	await page.goto('/admin/billing')
	await expect(page.getByRole('heading', { name: /Facturaci[oó]n/i })).toBeVisible()
}

test.describe('Payment proofs and reconciliation', () => {
	test('resident uploads proof and admin verifies the pending payment', async ({ request, page }) => {
		const scenario = await createAdminCondominiumScenario(request, 'billing.primary')
		const resident = await createResidentScenario(request, scenario.superToken, scenario.unitId)
		const concept = 'Cuota extraordinaria de mantenimiento'
		const amount = 1250
		const reference = `TRX-${Date.now().toString().slice(-4)}`

		await createCharge(request, scenario.superToken, scenario, concept, amount)

		await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
		await page.goto('/resident/payments')

		await expect(page.getByRole('heading', { name: 'Mis Pagos' })).toBeVisible()
		const chargeCard = page.locator('div').filter({ hasText: concept }).first()
		await expect(chargeCard).toBeVisible({ timeout: 20000 })
		await chargeCard.getByRole('button', { name: 'Pagar' }).click()

		await expect(page.getByRole('heading', { name: 'Registrar Pago' })).toBeVisible()
		await page.getByPlaceholder('Ej: Folio de transferencia, número de cheque...').fill(reference)

		await page.locator('input[type="file"]').setInputFiles('tests/fixtures/payment-proof.pdf')

		await expect(page.getByText('payment-proof.pdf')).toBeVisible()
		await page.getByRole('button', { name: 'Confirmar Pago' }).click()
		await expect(page.getByRole('heading', { name: 'Registrar Pago' })).toBeHidden({ timeout: 20000 })

		await expect.poll(async () => {
			const items = await getPendingPayments(request, scenario.superToken, scenario.condominiumId)
			return items.some((item: any) => item.chargeConcept === concept)
		}, { timeout: 20000 }).toBe(true)

		const pendingPayments = await getPendingPayments(request, scenario.superToken, scenario.condominiumId)
		const pendingPayment = pendingPayments.find((item: any) => item.chargeConcept === concept)
		expect(pendingPayment).toBeTruthy()
		if (!pendingPayment) {
			throw new Error('No se encontro el pago pendiente esperado')
		}
		expect(pendingPayment.referenceNumber).toBe(reference)
		expect(pendingPayment.proofImageUrl).toBeTruthy()

		await expect(chargeCard.locator('span').filter({ hasText: 'Por Verificar' }).first()).toBeVisible({ timeout: 20000 })
		await expect(page.getByText(/Tienes pagos pendientes de verificaci[oó]n/i)).toBeVisible()

		await openAdminBillingAsCondoAdmin(page, scenario)
		await page.getByRole('button', { name: 'Pagos Pendientes' }).click()

		const pendingCard = page.locator('div').filter({ hasText: concept }).first()
		await expect(pendingCard).toBeVisible({ timeout: 20000 })
		await expect(pendingCard.getByText(reference)).toBeVisible()
		await expect(pendingCard.getByRole('button', { name: /Ver PDF|Ver comprobante/i })).toBeVisible()

		await pendingCard.getByRole('button', { name: 'Confirmar Pago' }).click()
		await page.getByRole('button', { name: /S[ií], Verificar/i }).click()

		await expect.poll(async () => {
			const items = await getPendingPayments(request, scenario.superToken, scenario.condominiumId)
			return items.some((item: any) => item.chargeConcept === concept)
		}, { timeout: 20000 }).toBe(false)

		await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
		await page.goto('/resident/payments')
		const verifiedCard = page.locator('div').filter({ hasText: concept }).first()
		await expect(verifiedCard).toBeVisible({ timeout: 20000 })
		await expect(verifiedCard.locator('span').filter({ hasText: 'Verificado' }).first()).toBeVisible({ timeout: 20000 })
	})

	test('refund reverses unit balance and monthly collection summary', async ({ request }) => {
		const scenario = await createAdminCondominiumScenario(request, 'billing.refund')
		const concept = 'Cuota extraordinaria con reembolso'
		const amount = 980
		const { chargeId, month, year } = await createCharge(request, scenario.superToken, scenario, concept, amount)

		const recordPayment = await request.post(`${API_BASE}/billing/payments`, {
			headers: { Authorization: `Bearer ${scenario.superToken}` },
			data: {
				chargeId,
				amount,
				paymentMethod: 1,
				paymentDate: new Date().toISOString(),
				receivedById: scenario.adminUserId,
				referenceNumber: `RF-${Date.now().toString().slice(-4)}`,
				notes: 'Pago para validar reversion contable basica'
			}
		})

		expect(recordPayment.ok()).toBeTruthy()
		const paymentId = asId(await recordPayment.json())

		const paidBalance = await getUnitBalance(request, scenario.superToken, scenario.unitId)
		expect(paidBalance.totalPaid).toBe(amount)
		expect(paidBalance.balance).toBe(0)

		const paidSummary = await getBillingSummary(request, scenario.superToken, scenario.condominiumId, month, year)
		expect(paidSummary.totalCollected).toBe(amount)
		expect(paidSummary.totalPending).toBe(0)

		const pendingBeforeRefund = await getPendingPayments(request, scenario.superToken, scenario.condominiumId)
		expect(pendingBeforeRefund.some((item: any) => item.id === paymentId)).toBe(true)

		const refundResponse = await request.post(`${API_BASE}/billing/payments/${paymentId}/refund`, {
			headers: { Authorization: `Bearer ${scenario.superToken}` },
			data: {
				reason: 'Comprobante rechazado en conciliacion',
				refundedById: scenario.adminUserId
			}
		})

		expect(refundResponse.status()).toBe(204)

		const chargeAfterRefund = await getChargeDetail(request, scenario.superToken, chargeId)
		expect(chargeAfterRefund.paidAmount).toBe(0)
		expect(chargeAfterRefund.balance).toBe(amount)
		expect(chargeAfterRefund.status).toBe(0)
		expect(chargeAfterRefund.payments).toHaveLength(1)
		expect(chargeAfterRefund.payments[0].isRefunded).toBe(true)
		expect(chargeAfterRefund.payments[0].refundReason).toContain('Comprobante rechazado')

		const balanceAfterRefund = await getUnitBalance(request, scenario.superToken, scenario.unitId)
		expect(balanceAfterRefund.totalPaid).toBe(0)
		expect(balanceAfterRefund.balance).toBe(amount)

		const summaryAfterRefund = await getBillingSummary(request, scenario.superToken, scenario.condominiumId, month, year)
		expect(summaryAfterRefund.totalCollected).toBe(0)
		expect(summaryAfterRefund.totalPending).toBe(amount)

		const pendingAfterRefund = await getPendingPayments(request, scenario.superToken, scenario.condominiumId)
		expect(pendingAfterRefund.some((item: any) => item.id === paymentId)).toBe(false)
	})
})
