import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api';
const SUPERADMIN_EMAIL = 'superadmin@novaresidence.com';
const SUPERADMIN_PASSWORD = 'Pass123.';

type LoginResult = {
  token: string;
  userId: string;
};

type TestAdminContext = {
  authToken: string;
  adminUserId: string;
  adminEmail: string;
  adminPassword: string;
  planId: string;
  condominiumId: string;
  subscriptionId: string;
};

let testContext: TestAdminContext;

function unwrapData<T = any>(payload: any): T {
  if (payload?.data !== undefined) return payload.data as T;
  return payload as T;
}

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}@e2e.local`;
}

async function loginAPI(request: APIRequestContext, email: string, password: string): Promise<LoginResult> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password }
  });
  expect(response.ok()).toBeTruthy();

  const payload = unwrapData(await response.json());
  const token = payload?.accessToken || payload?.AccessToken;
  const user = payload?.user || payload?.User || {};
  const userId = user?.id || user?.Id || payload?.userId || payload?.UserId;

  expect(token).toBeTruthy();
  expect(userId).toBeTruthy();

  return { token, userId };
}

async function loginUI(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(superadmin|admin|resident)/, { timeout: 15000 });
}

async function registerConfirmedAdminUser(request: APIRequestContext): Promise<{ email: string; password: string; userId: string }> {
  const email = uniqueEmail('subscription.admin');
  const password = 'Pass123.';

  const registerResponse = await request.post(`${API_BASE}/auth/register`, {
    data: {
      email,
      password,
      firstName: 'Subscription',
      lastName: 'Admin',
      phoneNumber: '5512345678',
      role: 'admin'
    }
  });

  expect(registerResponse.ok()).toBeTruthy();
  const registerPayload = unwrapData(await registerResponse.json());
  const userId = registerPayload?.userId || registerPayload?.UserId;

  expect(userId).toBeTruthy();
  return { email, password, userId };
}

async function getFirstPlanId(request: APIRequestContext): Promise<string> {
  const plansRes = await request.get(`${API_BASE}/SubscriptionPlans`);
  expect(plansRes.ok()).toBeTruthy();

  const plans = unwrapData<any[]>(await plansRes.json());
  expect(Array.isArray(plans)).toBeTruthy();
  expect(plans.length).toBeGreaterThan(0);

  return plans[0].id as string;
}

async function createTestCondominium(request: APIRequestContext, token: string, userId: string): Promise<string> {
  const timestamp = Date.now();
  const createResponse = await request.post(`${API_BASE}/condominiums`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      userId,
      name: `Condo Suscripcion ${timestamp}`,
      description: 'Condominio de prueba para flujo de suscripciones',
      street: 'Av. Insurgentes 100',
      city: 'Ciudad de Mexico',
      state: 'Ciudad de Mexico',
      postalCode: '06600',
      country: 'Mexico',
      countryId: null,
      stateId: null,
      neighborhood: 'Centro',
      buildings: [
        {
          name: 'Torre Suscripciones',
          type: 'vertical',
          section: 'A',
          totalFloors: 2,
          startsAtGroundFloor: true,
          units: Array.from({ length: 10 }, (_, index) => ({
            unitNumber: `S-${timestamp.toString().slice(-4)}-${index + 1}`,
            floor: index < 5 ? 1 : 2,
            isCommercial: false,
            area: 70,
            bedrooms: 2,
            bathrooms: 1,
            monthlyMaintenanceFee: 1000
          }))
        }
      ]
    }
  });

  expect(createResponse.status()).toBe(201);
  const payload = unwrapData(await createResponse.json());
  const condominiumId = payload?.condominiumId || payload?.CondominiumId;
  expect(condominiumId).toBeTruthy();

  return condominiumId as string;
}

async function createSubscription(request: APIRequestContext, authToken: string, adminUserId: string, planId: string): Promise<string> {
  const response = await request.post(`${API_BASE}/Subscriptions`, {
    headers: { Authorization: `Bearer ${authToken}` },
    data: {
      adminUserId,
      planId,
      unitCount: 10
    }
  });

  if (response.status() === 409) {
    const existingResponse = await request.get(`${API_BASE}/Subscriptions/user/${adminUserId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    expect(existingResponse.status()).toBe(200);
    const existingPayload = await existingResponse.json();
    const existingSubscriptionId = existingPayload?.id || existingPayload?.Id;
    expect(existingSubscriptionId).toBeTruthy();
    return existingSubscriptionId as string;
  }

  expect(response.status()).toBe(201);
  const payload = await response.json();
  const subscriptionId = payload?.id || payload?.Id;
  expect(subscriptionId).toBeTruthy();

  return subscriptionId as string;
}

// ─────────────────────────────────────────────────
// TEST SUITE: Subscription Plans API
// ─────────────────────────────────────────────────
test.describe('Subscription Plans API', () => {
  test('GET /api/SubscriptionPlans returns seeded plans', async ({ request }) => {
    const response = await request.get(`${API_BASE}/SubscriptionPlans`);
    expect(response.status()).toBe(200);
    
    const plans = await response.json();
    expect(plans).toBeInstanceOf(Array);
    expect(plans.length).toBeGreaterThanOrEqual(3);
    
    // Verify plan structure
    const basicPlan = plans.find((p: any) => p.name === 'Básico');
    expect(basicPlan).toBeTruthy();
    expect(basicPlan.pricePerUnit).toBe(49);
    expect(basicPlan.minUnits).toBe(1);
    expect(basicPlan.maxUnits).toBe(20);
    expect(basicPlan.trialDays).toBe(30);

    const proPlan = plans.find((p: any) => p.name === 'Profesional');
    expect(proPlan).toBeTruthy();
    expect(proPlan.isRecommended).toBe(true);
    expect(proPlan.pricePerUnit).toBe(39);
  });

  test('GET /api/SubscriptionPlans/calculate returns pricing for 10 units', async ({ request }) => {
    const response = await request.get(`${API_BASE}/SubscriptionPlans/calculate?units=10`);
    expect(response.status()).toBe(200);

    const calcs = await response.json();
    expect(calcs).toBeInstanceOf(Array);
    
    const basicCalc = calcs.find((c: any) => c.planName === 'Básico');
    expect(basicCalc).toBeTruthy();
    expect(basicCalc.monthlyTotal).toBe(490); // 49 * 10
    expect(basicCalc.isEligible).toBe(true);
  });

  test('GET /api/SubscriptionPlans/calculate rejects 0 units', async ({ request }) => {
    const response = await request.get(`${API_BASE}/SubscriptionPlans/calculate?units=0`);
    expect(response.status()).toBe(400);
  });
});

// ─────────────────────────────────────────────────
// TEST SUITE: Subscription Lifecycle
// ─────────────────────────────────────────────────
test.describe('Subscription Lifecycle', () => {
  test.beforeAll(async ({ request }) => {
    const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    const planId = await getFirstPlanId(request);
    const admin = await registerConfirmedAdminUser(request);
    const condominiumId = await createTestCondominium(request, superadmin.token, admin.userId);
    const subscriptionId = await createSubscription(request, superadmin.token, admin.userId, planId);

    testContext = {
      authToken: superadmin.token,
      adminUserId: admin.userId,
      adminEmail: admin.email,
      adminPassword: admin.password,
      planId,
      condominiumId,
      subscriptionId
    };
  });

  test('should create a subscription with free trial', async ({ request }) => {
    const detailResponse = await request.get(`${API_BASE}/Subscriptions/user/${testContext.adminUserId}`, {
      headers: { Authorization: `Bearer ${testContext.authToken}` }
    });

    expect(detailResponse.status()).toBe(200);
    const detail = await detailResponse.json();

    expect(detail.id).toBe(testContext.subscriptionId);
    expect(detail.adminUserId).toBe(testContext.adminUserId);
    expect(detail.status).not.toBeUndefined();
    expect(detail.monthlyAmount).toBeGreaterThan(0);
    expect(detail.billedUnits).toBe(10);
  });

  test('should get subscription status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/Subscriptions/status/${testContext.adminUserId}`, {
      headers: { Authorization: `Bearer ${testContext.authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const status = await response.json();
    
    expect(status.hasSubscription ?? status.HasSubscription).toBe(true);
    expect(status.status ?? status.Status).toBeTruthy();
    expect(status.planName ?? status.PlanName).toBeTruthy();
    expect(status.monthlyAmount ?? status.MonthlyAmount).toBeGreaterThanOrEqual(0);
    expect(status.billedUnits ?? status.BilledUnits).toBe(10);
  });

  test('should get full subscription detail', async ({ request }) => {
    const response = await request.get(`${API_BASE}/Subscriptions/user/${testContext.adminUserId}`, {
      headers: { Authorization: `Bearer ${testContext.authToken}` }
    });

    expect(response.status()).toBe(200);
    const detail = await response.json();
    
    expect(detail.id).toBe(testContext.subscriptionId);
    expect(detail.plan).toBeTruthy();
    expect(detail.plan.name).toBeTruthy();
    expect(detail.billedUnits).toBe(10);
    expect(detail.statusText).toBeTruthy();
    expect(detail.condominiumCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(detail.condominiums)).toBeTruthy();
  });

  test('should register a payment and extend subscription', async ({ request }) => {
    const beforeResponse = await request.get(`${API_BASE}/Subscriptions/user/${testContext.adminUserId}`, {
      headers: { Authorization: `Bearer ${testContext.authToken}` }
    });
    expect(beforeResponse.status()).toBe(200);
    const beforeDetail = await beforeResponse.json();
    const beforePeriodEnd = new Date(beforeDetail.currentPeriodEnd as string);

    const response = await request.post(`${API_BASE}/Subscriptions/${testContext.subscriptionId}/payments`, {
      headers: { Authorization: `Bearer ${testContext.authToken}` },
      data: {
        amount: 490,
        monthsPaid: 1,
        paymentMethod: 'BankTransfer',
        referenceNumber: `TEST-PAY-${Date.now()}`,
        notes: 'Playwright test payment'
      }
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    
    expect(result.paymentId ?? result.PaymentId).toBeTruthy();
    expect(result.newStatus ?? result.NewStatus).toBe('Active');
    expect(result.currentPeriodEnd ?? result.CurrentPeriodEnd).toBeTruthy();

    const afterResponse = await request.get(`${API_BASE}/Subscriptions/user/${testContext.adminUserId}`, {
      headers: { Authorization: `Bearer ${testContext.authToken}` }
    });
    expect(afterResponse.status()).toBe(200);
    const afterDetail = await afterResponse.json();
    const afterPeriodEnd = new Date(afterDetail.currentPeriodEnd as string);

    expect(afterPeriodEnd.getTime()).toBeGreaterThan(beforePeriodEnd.getTime());
    expect(Array.isArray(afterDetail.recentPayments)).toBeTruthy();
    expect(afterDetail.recentPayments.length).toBeGreaterThan(0);
  });

  test('should list all subscriptions (SuperAdmin)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/Subscriptions`, {
      headers: { Authorization: `Bearer ${testContext.authToken}` }
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.data).toBeInstanceOf(Array);
  });
});

// ─────────────────────────────────────────────────
// TEST SUITE: UI - Subscription Plans Visibility
// ─────────────────────────────────────────────────
test.describe('UI - Subscription Flow', () => {
  test('SuperAdmin can access admin areas without subscription block', async ({ page }) => {
    await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    
    // SuperAdmin should be redirected to superadmin dashboard
    await expect(page).toHaveURL(/\/superadmin/);

    // Navigate to clients — should work without subscription block
    await page.click('a[href="/superadmin/clients"]');
    await page.waitForLoadState('networkidle');
    
    // Should NOT show subscription expired page
    const expiredText = page.locator('text=Suscripción Expirada');
    await expect(expiredText).not.toBeVisible({ timeout: 3000 });
  });

  test('SuperAdmin can see subscription plans in API', async ({ page, request }) => {
    // Verify plans are publicly accessible
    const response = await request.get(`${API_BASE}/SubscriptionPlans`);
    expect(response.status()).toBe(200);
    
    const plans = await response.json();
    expect(plans.length).toBeGreaterThanOrEqual(3);
    
    // Verify each plan has required fields
    for (const plan of plans) {
      expect(plan.name).toBeTruthy();
      expect(plan.pricePerUnit).toBeGreaterThanOrEqual(0);
      expect(plan.trialDays).toBeGreaterThan(0);
      expect(plan.features).toBeTruthy();
    }
  });

  test('Login page loads correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Should see login form
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('SuperAdmin login and navigation works', async ({ page }) => {
    await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    
    // Should see the dashboard
    await expect(page).toHaveURL(/\/superadmin/);
    
    // Should see navigation items
    await expect(page.getByText('NovaResidence', { exact: true }).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────
// TEST SUITE: Payment Required (402) Flow
// ─────────────────────────────────────────────────
test.describe('Payment Required API Flow', () => {
  test('subscription status endpoint returns proper structure', async ({ request }) => {
    const auth = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);

    const response = await request.get(`${API_BASE}/Subscriptions/status/${auth.userId}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    expect(response.status()).toBe(200);
    const status = await response.json();
    expect(status.HasSubscription ?? status.hasSubscription).not.toBeUndefined();
    expect(status.IsAccessGranted ?? status.isAccessGranted).not.toBeUndefined();
  });

  test('price calculation shows correct amounts per plan', async ({ request }) => {
    // Test with 50 units
    const response = await request.get(`${API_BASE}/SubscriptionPlans/calculate?units=50`);
    expect(response.status()).toBe(200);
    
    const calcs = await response.json();
    
    // Básico (49/unit): should be eligible (1-20 units) — not eligible for 50
    const basic = calcs.find((c: any) => c.planName === 'Básico');
    expect(basic).toBeTruthy();
    expect(basic.monthlyTotal).toBe(2450); // 49 * 50
    expect(basic.isEligible).toBe(false); // max 20 units

    // Profesional (39/unit, 21-100 units): eligible
    const pro = calcs.find((c: any) => c.planName === 'Profesional');
    expect(pro).toBeTruthy();
    expect(pro.monthlyTotal).toBe(1950); // 39 * 50
    expect(pro.isEligible).toBe(true);

    // Empresarial (29/unit, 101-500 units): not eligible for 50
    const enterprise = calcs.find((c: any) => c.planName === 'Empresarial');
    expect(enterprise).toBeTruthy();
    expect(enterprise.monthlyTotal).toBe(1450); // 29 * 50
    expect(enterprise.isEligible).toBe(false);
  });
});
