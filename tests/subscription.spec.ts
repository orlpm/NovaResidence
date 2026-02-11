import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:5001/api';
const SUPERADMIN_EMAIL = 'superadmin@novaresidence.com';
const SUPERADMIN_PASSWORD = 'Pass123.';

let authToken = '';

// Helper: login via API and get token
async function loginAPI(request: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password }
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  const token = data.data?.accessToken || data.accessToken;
  expect(token).toBeTruthy();
  return token;
}

// Helper: login via browser
async function loginUI(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(superadmin|admin|resident)/, { timeout: 15000 });
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
  let planId = '';
  let condominiumId = '';
  let subscriptionId = '';

  test.beforeAll(async ({ request }) => {
    // Login as superadmin
    authToken = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);

    // Get the first plan
    const plansRes = await request.get(`${API_BASE}/SubscriptionPlans`);
    const plans = await plansRes.json();
    planId = plans[0].id;

    // Get or create a test condominium
    const condosRes = await request.get(`${API_BASE}/condominiums`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const condos = await condosRes.json();
    
    if (condos.length > 0) {
      condominiumId = condos[0].id;
    }
  });

  test('should create a subscription with free trial', async ({ request }) => {
    test.skip(!condominiumId, 'No condominium available for testing');

    const response = await request.post(`${API_BASE}/Subscriptions`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        condominiumId,
        planId,
        unitCount: 10
      }
    });

    // Might be 201 (created) or 409 (already exists)
    if (response.status() === 409) {
      // Already has a subscription — fetch existing
      const statusRes = await request.get(`${API_BASE}/Subscriptions/status/${condominiumId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(statusRes.status()).toBe(200);
      
      const detailRes = await request.get(`${API_BASE}/Subscriptions/condominium/${condominiumId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (detailRes.ok()) {
        const detail = await detailRes.json();
        subscriptionId = detail.id;
      }
      return;
    }

    expect(response.status()).toBe(201);
    const data = await response.json();
    subscriptionId = data.id;
    expect(data.status).toBeDefined();
    expect(data.monthlyAmount).toBeGreaterThan(0);
  });

  test('should get subscription status', async ({ request }) => {
    test.skip(!condominiumId, 'No condominium available');

    const response = await request.get(`${API_BASE}/Subscriptions/status/${condominiumId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const status = await response.json();
    
    expect(status.hasSubscription).toBe(true);
    expect(status.status).toBeTruthy();
    expect(status.planName).toBeTruthy();
    expect(status.monthlyAmount).toBeGreaterThanOrEqual(0);
  });

  test('should get full subscription detail', async ({ request }) => {
    test.skip(!condominiumId, 'No condominium available');

    const response = await request.get(`${API_BASE}/Subscriptions/condominium/${condominiumId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.status() === 404) {
      test.skip(true, 'No subscription found');
      return;
    }

    expect(response.status()).toBe(200);
    const detail = await response.json();
    
    subscriptionId = detail.id;
    expect(detail.plan).toBeTruthy();
    expect(detail.plan.name).toBeTruthy();
    expect(detail.billedUnits).toBeGreaterThan(0);
    expect(detail.statusText).toBeTruthy();
  });

  test('should register a payment and extend subscription', async ({ request }) => {
    test.skip(!subscriptionId, 'No subscription to pay for');

    const response = await request.post(`${API_BASE}/Subscriptions/${subscriptionId}/payments`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        amount: 490,
        monthsPaid: 1,
        paymentMethod: 'BankTransfer',
        referenceNumber: 'TEST-PAY-001',
        notes: 'Playwright test payment'
      }
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    
    expect(result.paymentId).toBeTruthy();
    expect(result.newStatus).toBe('Active');
    expect(result.currentPeriodEnd).toBeTruthy();
  });

  test('should list all subscriptions (SuperAdmin)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/Subscriptions`, {
      headers: { Authorization: `Bearer ${authToken}` }
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
    authToken = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    
    // Status for a non-existent condominium
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(`${API_BASE}/Subscriptions/status/${fakeId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(response.status()).toBe(200);
    const status = await response.json();
    expect(status.hasSubscription).toBe(false);
    expect(status.isAccessGranted).toBe(false);
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
