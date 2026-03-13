/**
 * Demo video recorder v2 for NovaResidence "Ver Demo" button.
 *
 * Shows the full journey from scratch:
 *   1. Landing page overview
 *   2. Admin registration (Comenzar Gratis)
 *   3. Email confirmation (bypassed via SQL)
 *   4. Login → Onboarding wizard (Condominium, Buildings, Units, Residents)
 *   5. Admin dashboard overview
 *   6. Amenities — create a new amenity
 *   7. Billing — create a maintenance charge + view pending payments
 *   8. Final dashboard view
 *
 * Features:
 *   - Visual button highlights (pulsing ring) before every click
 *   - Background spring music via Web Audio API
 *
 * Usage:
 *   npx playwright test tests/record-demo.spec.ts --project=chromium --headed
 */
import { test, expect, type Page, type Locator } from '@playwright/test'
import {
  API_BASE,
  loginAPI,
  loginSuperadminAPI,
  uniqueEmail,
  unwrapData
} from './e2e/helpers/auth'
import { asId } from './e2e/helpers/condominium'
import { confirmUserEmailByEmail } from './e2e/helpers/sql'

/* ── Timing helpers ────────────────────────────────────────────────── */
const BEAT     = 1000
const PAUSE    = 1800
const LINGER   = 3000
const SHOWCASE = 4500

async function beat(page: Page)     { await page.waitForTimeout(BEAT) }
async function pause(page: Page)    { await page.waitForTimeout(PAUSE) }
async function linger(page: Page)   { await page.waitForTimeout(LINGER) }
async function showcase(page: Page) { await page.waitForTimeout(SHOWCASE) }

/* ── Visual highlight ring ─────────────────────────────────────────── */
async function injectHighlightStyles(page: Page) {
  await page.addStyleTag({
    content: `
      @keyframes demo-pulse {
        0%   { box-shadow: 0 0 0 0 rgba(14,165,233,.7); }
        70%  { box-shadow: 0 0 0 14px rgba(14,165,233,0); }
        100% { box-shadow: 0 0 0 0 rgba(14,165,233,0); }
      }
      .demo-highlight {
        animation: demo-pulse 0.8s ease-out 2;
        outline: 3px solid rgba(14,165,233,.85);
        outline-offset: 3px;
        border-radius: 8px;
        z-index: 9999;
        position: relative;
      }
    `
  })
}

/** Add a pulsing ring highlight to a locator, wait, then click. */
async function highlightAndClick(loc: Locator, opts?: { delay?: number }) {
  const page = loc.page()
  const delay = opts?.delay ?? 1200
  try {
    await loc.scrollIntoViewIfNeeded({ timeout: 3000 })
  } catch { /* already visible */ }
  await loc.evaluate(el => el.classList.add('demo-highlight'))
  await page.waitForTimeout(delay)
  await loc.evaluate(el => el.classList.remove('demo-highlight'))
  await loc.click()
  await page.waitForTimeout(400)
}

/** Highlight an element without clicking (just to draw attention). */
async function highlightOnly(loc: Locator, duration = 1500) {
  try { await loc.scrollIntoViewIfNeeded({ timeout: 3000 }) } catch {}
  await loc.evaluate(el => el.classList.add('demo-highlight'))
  await loc.page().waitForTimeout(duration)
  await loc.evaluate(el => el.classList.remove('demo-highlight'))
}

/** Type text character-by-character so the viewer can follow. */
async function humanType(loc: Locator, text: string) {
  await loc.click()
  await loc.page().waitForTimeout(200)
  await loc.pressSequentially(text, { delay: 50 })
  await beat(loc.page())
}

/* ── Spring music via Web Audio API ────────────────────────────────── */
async function startSpringMusic(page: Page) {
  await page.evaluate(() => {
    const ac = new AudioContext()
    const masterGain = ac.createGain()
    masterGain.gain.value = 0.12
    masterGain.connect(ac.destination)

    /* ── Helpers ─────────────────────────────────────────────── */
    /** Create a "string ensemble" voice: detuned sawtooth pair → lowpass. */
    function playString(freq: number, start: number, dur: number, vol: number) {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 3000
      lp.Q.value = 0.7

      for (const detune of [-6, 6]) {
        const osc = ac.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = freq
        osc.detune.value = detune
        const env = ac.createGain()
        env.gain.setValueAtTime(0, start)
        env.gain.linearRampToValueAtTime(vol, start + 0.03)
        env.gain.setValueAtTime(vol, start + dur * 0.8)
        env.gain.exponentialRampToValueAtTime(0.001, start + dur)
        osc.connect(env)
        env.connect(lp)
        osc.start(start)
        osc.stop(start + dur + 0.05)
      }
      lp.connect(masterGain)
    }

    /** Short staccato note for fast passages. */
    function playStaccato(freq: number, start: number, dur: number, vol: number) {
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 4000
      const osc = ac.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      const env = ac.createGain()
      env.gain.setValueAtTime(0, start)
      env.gain.linearRampToValueAtTime(vol, start + 0.015)
      env.gain.exponentialRampToValueAtTime(0.001, start + dur)
      osc.connect(env)
      env.connect(lp)
      lp.connect(masterGain)
      osc.start(start)
      osc.stop(start + dur + 0.02)
    }

    /* ── Musical material (original Baroque-inspired, D minor) ── */
    // Frequencies: D3=146.83 A3=220 D4=293.66 F4=349.23 A4=440
    // Bb4=466.16 C5=523.25 D5=587.33 E5=659.25 F5=698.46 G5=783.99 A5=880
    const D3=146.83, A3=220, D4=293.66, F4=349.23, G4=392, A4=440,
          Bb4=466.16, C5=523.25, D5=587.33, E5=659.25, F5=698.46,
          G5=783.99, A5=880, Bb3=233.08, C4=261.63, E4=329.63,
          G3=196, F3=174.61

    const BPM = 140
    const Q = 60 / BPM / 4          // sixteenth note
    const E = Q * 2                  // eighth note
    const QN = Q * 4                 // quarter note
    const HN = Q * 8                 // half note

    let t = ac.currentTime + 0.15

    function schedulePhrase() {
      /* ── A: Powerful opening – bold chords + driving bass ── */
      // Bar 1: D minor chord hits
      playString(D3, t, QN, 0.5)
      playString(D4, t, QN, 0.35)
      playString(A4, t, QN, 0.35)
      playString(D5, t, QN, 0.3)
      t += QN

      // Fast ascending scale run (sixteenths)
      const run1 = [D4, E4, F4, G4, A4, Bb4, C5, D5]
      for (const n of run1) { playStaccato(n, t, Q * 0.8, 0.3); t += Q }

      // Bar 2: A minor → landing
      playString(A3, t, QN, 0.45)
      playString(C5, t, QN, 0.3)
      playString(E5, t, QN, 0.3)
      t += QN

      // Descending run
      const run2 = [A5, G5, F5, E5, D5, C5, Bb4, A4]
      for (const n of run2) { playStaccato(n, t, Q * 0.8, 0.3); t += Q }

      /* ── B: Melodic theme – singing upper voice + bass ── */
      // Bar 3
      playString(D3, t, HN, 0.4)          // bass pedal
      playString(D5, t, QN, 0.35)
      t += QN
      playString(F5, t, E, 0.25)
      t += E
      playString(E5, t, E, 0.25)
      t += E

      // Bar 4
      playString(Bb3, t, HN, 0.4)
      playString(D5, t, QN * 0.75, 0.3)
      t += QN * 0.75
      playString(C5, t, QN * 0.25, 0.2)
      t += QN * 0.25
      playString(Bb4, t, QN, 0.3)
      t += QN

      /* ── C: Arpeggiated drive – fast broken chords ── */
      // Bar 5: Dm arpeggio
      const arp1 = [D4, F4, A4, D5, A4, F4, D4, F4]
      playString(D3, t, HN, 0.4)
      for (const n of arp1) { playStaccato(n, t, Q * 0.85, 0.28); t += Q }

      // Bar 6: Gm arpeggio
      const arp2 = [G3, Bb3, D4, G4, D4, Bb3, G3, Bb3]
      playString(G3, t, HN, 0.4)
      for (const n of arp2) { playStaccato(n, t, Q * 0.85, 0.28); t += Q }

      // Bar 7: C major → F
      const arp3 = [C4, E4, G4, C5, G4, E4, C4, E4]
      playString(C4, t, HN, 0.4)
      for (const n of arp3) { playStaccato(n, t, Q * 0.85, 0.28); t += Q }

      // Bar 8: A → resolution
      const arp4 = [A3, C4, E4, A4, E4, C4, A3, C4]
      playString(A3, t, HN, 0.4)
      for (const n of arp4) { playStaccato(n, t, Q * 0.85, 0.25); t += Q }

      /* ── D: Triumphant resolution ── */
      // Bar 9: Big D minor → D major (Picardy third)
      playString(D3, t, HN, 0.55)
      playString(D4, t, HN, 0.4)
      playString(A4, t, HN, 0.35)
      playString(D5, t, HN, 0.35)
      playString(F5, t, HN, 0.3)
      t += HN

      // Final rising flourish
      const flourish = [D5, E5, F5, G5, A5]
      for (const n of flourish) { playStaccato(n, t, Q * 0.9, 0.35); t += Q }

      // Sustained final chord (D major for bright ending)
      const Fsharp5 = 739.99
      playString(D3, t, HN * 1.5, 0.5)
      playString(D4, t, HN * 1.5, 0.4)
      playString(Fsharp5, t, HN * 1.5, 0.35)
      playString(A5, t, HN * 1.5, 0.3)
      t += HN * 1.5

      // Brief silence between loops
      t += QN
    }

    // Each phrase ≈ 20 seconds at 140 BPM. Schedule enough to cover ~4 min.
    for (let i = 0; i < 14; i++) schedulePhrase()
    ;(window as any).__demoAudioCtx = ac
  })
}

/* ── Video test ────────────────────────────────────────────────────── */
test.use({
  video: { mode: 'on', size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  launchOptions: { slowMo: 100 },
})

test.skip('record demo video', async ({ page, request }) => {
  test.setTimeout(360_000) // 6 min max

  // Prepare demo admin credentials
  const adminEmail = `demo.admin.${Date.now().toString().slice(-5)}@novaresidence.test`
  const adminPassword = 'Demo2025.!'
  const adminFirstName = 'Laura'
  const adminLastName = 'Mendez'

  /* ────────── 1. Landing page ────────── */
  await page.goto('/home')
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await startSpringMusic(page)
  await showcase(page)

  // Scroll down to features
  await page.evaluate(() => {
    const el = document.querySelector('#features') || document.querySelector('[id*="feature"]')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    else window.scrollBy({ top: 600, behavior: 'smooth' })
  })
  await linger(page)

  // Scroll to pricing
  await page.evaluate(() => {
    const el = document.querySelector('#pricing') || document.querySelector('[id*="precio"]')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    else window.scrollBy({ top: 600, behavior: 'smooth' })
  })
  await linger(page)

  // Back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await pause(page)

  /* ────────── 2. Click "Comenzar Gratis" → Admin Registration ─── */
  const comenzarBtn = page.locator('button', { hasText: 'Comenzar Gratis' }).first()
  await highlightAndClick(comenzarBtn, { delay: 1500 })
  await page.waitForURL(/\/alta-administrador/, { timeout: 10000 })
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await pause(page)

  // Fill admin registration form (exact placeholders from AdminRegistrationStep)
  await humanType(page.getByPlaceholder('Juan'), adminFirstName)
  await humanType(page.getByPlaceholder('Pérez'), adminLastName)
  await humanType(page.locator('input[type="email"]'), adminEmail)
  await humanType(page.locator('input[type="tel"]'), '5512345678')

  // Passwords
  const pwFields = page.locator('input[type="password"]')
  await humanType(pwFields.first(), adminPassword)
  await humanType(pwFields.last(), adminPassword)

  await pause(page) // let viewer see the filled form

  // Submit registration
  const continuarBtn = page.getByRole('button', { name: /Continuar/i }).first()
  await highlightAndClick(continuarBtn, { delay: 1200 })
  await page.waitForTimeout(3000) // wait for API response

  // Should show success message with "Ir al login de administrador"
  const loginLink = page.locator('button', { hasText: /Ir al login/i }).first()
  await loginLink.waitFor({ state: 'visible', timeout: 10000 })
  await linger(page) // let viewer see the success message

  /* ────────── 3. Confirm email via SQL & Login ────────────────── */
  await confirmUserEmailByEmail(adminEmail)

  await highlightAndClick(loginLink, { delay: 1200 })
  await page.waitForURL(/\/auth\/login/, { timeout: 10000 })
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await pause(page)

  // Login — email is pre-populated from URL param, just highlight it
  const loginEmailInput = page.locator('#email')
  await highlightOnly(loginEmailInput, 1000)

  // Type password
  const loginPasswordInput = page.locator('#password')
  await humanType(loginPasswordInput, adminPassword)

  const loginBtn = page.getByRole('button', { name: /Iniciar Sesión/i })
  await highlightAndClick(loginBtn, { delay: 1200 })
  await page.waitForURL(/\/admin/, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await pause(page)

  /* ────────── 4. Onboarding Wizard ────────────────────────────── */
  // The wizard should display automatically for a new admin at /admin/onboarding
  const onboardingVisible = await page.locator('text=Configuración del Condominio').isVisible().catch(() => false)
  if (!onboardingVisible) {
    await page.goto('/admin/onboarding')
    await page.waitForLoadState('networkidle')
    await injectHighlightStyles(page)
  }
  await linger(page)

  // ── Step 1: Condominium Info (exact placeholders from CondominiumInfoStep.tsx) ──
  await expect(page.getByRole('heading', { name: 'Información del Condominio' })).toBeVisible({ timeout: 20000 })

  const condoNameInput = page.getByPlaceholder('Ej: Residencial Los Pinos')
  await condoNameInput.waitFor({ state: 'visible', timeout: 20000 })
  await humanType(condoNameInput, 'Residencial Primavera')

  await humanType(page.getByPlaceholder('Calle, número, colonia'), 'Av. de las Flores 250, Col. Jardines')
  await humanType(page.getByPlaceholder('Ciudad'), 'Ciudad de México')

  // Country select defaults to México — wait for states to load
  await page.waitForTimeout(2000) // wait for API to fetch countries & states

  // State select — pick first real state
  const stateSelect = page.locator('select').nth(1) // second select (first is country)
  if (await stateSelect.isVisible().catch(() => false)) {
    const stateOpts = await stateSelect.locator('option').count()
    if (stateOpts > 1) {
      await stateSelect.selectOption({ index: 1 })
      await beat(page)
    }
  }

  // Zip code (placeholder "00000")
  await humanType(page.getByPlaceholder('00000'), '03100')

  await pause(page) // let viewer see condominium info

  // Click "Continuar" to next step
  const step1Continue = page.getByRole('button', { name: /Continuar/i }).first()
  await highlightAndClick(step1Continue)
  await page.waitForTimeout(1500)

  // ── Step 2: Building Type ──
  // Select "Vertical" card (it's a clickable div, not a button)
  const verticalCard = page.locator('h4', { hasText: 'Vertical' }).first()
  await verticalCard.waitFor({ state: 'visible', timeout: 5000 })
  await highlightAndClick(verticalCard, { delay: 1000 })
  await pause(page)

  const step2Continue = page.getByRole('button', { name: /Continuar/i }).first()
  await highlightAndClick(step2Continue)
  await page.waitForTimeout(1500)

  // ── Step 3: Units Setup — Add a building ──
  const buildingNameInput = page.getByPlaceholder('Ej: Torre A, Edificio Norte, Manzana 1')
  await buildingNameInput.waitFor({ state: 'visible', timeout: 5000 })
  await humanType(buildingNameInput, 'Torre Jacarandas')

  // Number of units (already 10 by default, change to 8)
  const unitsInput = page.locator('input[type="number"]').first()
  if (await unitsInput.isVisible().catch(() => false)) {
    await unitsInput.click()
    await unitsInput.fill('8')
    await beat(page)
  }

  // Floors for vertical (already 5 by default, change to 4)
  const floorsInput = page.locator('input[type="number"]').nth(1)
  if (await floorsInput.isVisible().catch(() => false)) {
    await floorsInput.click()
    await floorsInput.fill('4')
    await beat(page)
  }

  // Click "Agregar Edificio"
  const addBuildingBtn = page.getByRole('button', { name: /Agregar Edificio/i }).first()
  if (await addBuildingBtn.isVisible().catch(() => false)) {
    await highlightAndClick(addBuildingBtn)
    await pause(page)
  }

  await pause(page) // show the generated units

  const step3Continue = page.getByRole('button', { name: /Continuar/i }).first()
  await highlightAndClick(step3Continue)
  await page.waitForTimeout(1500)

  // ── Step 4: Resident Invitation ──
  // "Link de Auto-registro" is the default method, just highlight it
  const autoRegistroCard = page.locator('text=Link de Auto-registro').first()
  if (await autoRegistroCard.isVisible().catch(() => false)) {
    await highlightOnly(autoRegistroCard, 1500)
  }
  await pause(page)

  // Click "Finalizar Configuración"
  const finalizarBtn = page.getByRole('button', { name: /Finalizar/i }).first()
  if (await finalizarBtn.isVisible().catch(() => false)) {
    await highlightAndClick(finalizarBtn, { delay: 1500 })
  }
  await page.waitForTimeout(3000) // wait for condominium creation

  /* ────────── 5. Admin Dashboard ──────────────────────────────── */
  // Navigate to dashboard (onboarding should redirect there)
  await page.goto('/admin/dashboard')
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)

  // Mark onboarding as complete in case it wasn't
  await page.evaluate(() => {
    const authStore = localStorage.getItem('auth-storage')
    if (authStore) {
      try {
        const parsed = JSON.parse(authStore)
        const userId = parsed?.state?.user?.id
        if (userId) {
          localStorage.setItem(`admin_onboarding_status:${userId}`, 'completed')
        }
      } catch {}
    }
  })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await showcase(page)

  // Scroll down to see dashboard stats
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }))
  await linger(page)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await pause(page)

  // Now get the admin token for API calls
  const adminLogin = await loginAPI(request, adminEmail, adminPassword)
  const adminToken = adminLogin.token
  const adminUserId = adminLogin.userId

  // Get condominiumId
  const condosResp = await request.get(`${API_BASE}/condominiums`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  })
  const condosData = unwrapData<any[]>(await condosResp.json())
  const condominiumId = condosData?.[0]?.id ?? condosData?.[0]?.Id
  let unitId = ''

  if (condominiumId) {
    const condoDetailResp = await request.get(`${API_BASE}/condominiums/${condominiumId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    const condoDetail = unwrapData<any>(await condoDetailResp.json())
    unitId = condoDetail?.buildings?.[0]?.units?.[0]?.id ?? ''
  }

  /* ────────── 6. Amenities — create a new amenity ─────────────── */
  // Navigate via sidebar
  const amenitiesSidebarLink = page.locator('a[href="/admin/amenities"]').first()
  if (await amenitiesSidebarLink.isVisible().catch(() => false)) {
    await highlightAndClick(amenitiesSidebarLink, { delay: 1000 })
  } else {
    await page.goto('/admin/amenities')
  }
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await pause(page)

  // Click "Nueva Amenidad"
  const newAmenityBtn = page.getByRole('button', { name: /Nueva Amenidad/i })
  if (await newAmenityBtn.isVisible().catch(() => false)) {
    await highlightAndClick(newAmenityBtn, { delay: 1200 })
    await page.waitForTimeout(800)

    const modal = page.locator('.fixed.inset-0').last()

    // Fill amenity name
    const amenityNameInput = modal.locator('input[placeholder*="Alberca"], input[type="text"]').first()
    await humanType(amenityNameInput, 'Alberca Infinity')

    // Capacity
    const capacityInput = modal.locator('input[type="number"]').first()
    if (await capacityInput.isVisible().catch(() => false)) {
      await capacityInput.click()
      await capacityInput.fill('25')
      await beat(page)
    }

    await pause(page) // show filled form

    // Submit
    const createAmenitySubmit = modal.getByRole('button', { name: /Crear|Guardar/i }).first()
    if (await createAmenitySubmit.isVisible().catch(() => false)) {
      await highlightAndClick(createAmenitySubmit)
      await page.waitForTimeout(2000)
    }
  }

  // Reload to show the created amenity
  await page.goto('/admin/amenities')
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await linger(page)

  /* ────────── 7. Billing — create charge ──────────────────────── */
  if (condominiumId && unitId) {
    // Seed a charge via API so billing page has data
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await request.post(`${API_BASE}/billing/charges`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        condominiumId,
        unitId,
        concept: 'Cuota de mantenimiento - Abril 2026',
        feeType: 0,
        amount: 1400,
        dueDate: dueDate.toISOString(),
        billingPeriodMonth: dueDate.getMonth() + 1,
        billingPeriodYear: dueDate.getFullYear(),
        applyLateFee: false,
      },
    }).catch(() => {})
  }

  // Navigate to billing via sidebar
  const billingSidebarLink = page.locator('a[href="/admin/billing"]').first()
  if (await billingSidebarLink.isVisible().catch(() => false)) {
    await highlightAndClick(billingSidebarLink, { delay: 1000 })
  } else {
    await page.goto('/admin/billing')
  }
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await page.waitForTimeout(2000) // wait for data to load
  await linger(page)

  // Click "Nuevo Cargo" to show the modal
  const nuevoCargoBtn = page.getByRole('button', { name: /Nuevo Cargo/i })
  if (await nuevoCargoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await highlightAndClick(nuevoCargoBtn, { delay: 1200 })
    await page.waitForTimeout(800)

    const modal = page.locator('.fixed.inset-0').last()

    // Select unit
    const unitSelect = modal.locator('select').first()
    await unitSelect.waitFor({ state: 'visible', timeout: 5000 })
    const unitOptions = await unitSelect.locator('option').allTextContents()
    const realUnit = unitOptions.find(o => !o.includes('Selecciona') && !o.includes('Todas') && !o.includes('―'))
    if (realUnit) {
      await unitSelect.selectOption({ label: realUnit })
      await beat(page)
    }

    // Fill Concepto
    const conceptInput = modal.locator('input[type="text"]').first()
    await humanType(conceptInput, 'Cuota de mantenimiento - Mayo 2026')

    // Fill Monto
    const amountInput = modal.locator('input[type="number"]')
    if (await amountInput.isVisible().catch(() => false)) {
      await amountInput.click()
      await amountInput.fill('1400')
      await beat(page)
    }

    // Fill Fecha de Vencimiento
    const dateInput = modal.locator('input[type="date"]')
    if (await dateInput.isVisible().catch(() => false)) {
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await dateInput.fill(dueDate.toISOString().split('T')[0])
      await beat(page)
    }

    await pause(page) // show the filled form

    const crearCargoBtn = modal.getByRole('button', { name: /Crear Cargo/i })
    if (await crearCargoBtn.isVisible().catch(() => false)) {
      await highlightAndClick(crearCargoBtn)
      await page.waitForTimeout(2000)
    }
  }

  // Show charges list
  await page.goto('/admin/billing')
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await page.waitForTimeout(1500)
  await linger(page)

  // Switch to Pagos Pendientes tab
  const pendientesTab = page.getByText('Pagos Pendientes')
  if (await pendientesTab.isVisible().catch(() => false)) {
    await highlightAndClick(pendientesTab, { delay: 1000 })
    await pause(page)
  }

  // Switch to Saldos tab
  const saldosTab = page.getByText('Saldos')
  if (await saldosTab.isVisible().catch(() => false)) {
    await highlightAndClick(saldosTab, { delay: 800 })
    await pause(page)
  }

  // Switch to Resumen tab
  const resumenTab = page.getByText('Resumen')
  if (await resumenTab.isVisible().catch(() => false)) {
    await highlightAndClick(resumenTab, { delay: 800 })
    await pause(page)
  }

  /* ────────── 8. Quick tour of more sections ──────────────────── */
  // Residents
  const residentsSidebarLink = page.locator('a[href="/admin/residents"]').first()
  if (await residentsSidebarLink.isVisible().catch(() => false)) {
    await highlightAndClick(residentsSidebarLink, { delay: 800 })
    await page.waitForLoadState('networkidle')
    await injectHighlightStyles(page)
    await linger(page)
  }

  // Incidents
  await page.goto('/admin/incidents')
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await pause(page)

  // Communications
  await page.goto('/admin/communications')
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await pause(page)

  // Reservations
  const reservationsSidebarLink = page.locator('a[href="/admin/reservations"]').first()
  if (await reservationsSidebarLink.isVisible().catch(() => false)) {
    await highlightAndClick(reservationsSidebarLink, { delay: 800 })
    await page.waitForLoadState('networkidle')
    await injectHighlightStyles(page)
    await pause(page)
  }

  /* ────────── 9. Final — back to dashboard ────────────────────── */
  const dashboardLink = page.locator('a[href="/admin"]').first()
    .or(page.locator('a[href="/admin/dashboard"]').first())
  if (await dashboardLink.isVisible().catch(() => false)) {
    await highlightAndClick(dashboardLink, { delay: 800 })
  } else {
    await page.goto('/admin/dashboard')
  }
  await page.waitForLoadState('networkidle')
  await injectHighlightStyles(page)
  await showcase(page)

  // Scroll down one final time
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }))
  await linger(page)
})
