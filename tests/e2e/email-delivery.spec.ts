import { execFileSync } from 'child_process'
import { test, expect } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, unwrapData } from './helpers/auth'

const RECIPIENT = 'contacto@domuscond.com'

function brevoApiKey(): string {
  const azPython = process.env.AZ_PYTHON || 'C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\python.exe'
  const raw = execFileSync(azPython, [
    '-IBm', 'azure.cli',
    'webapp', 'config', 'appsettings', 'list',
    '-g', 'NovaResidence-RG',
    '-n', 'novaresidence-api',
    '--query', "[?name=='Email__BrevoApiKey'].value | [0]",
    '-o', 'tsv'
  ], { encoding: 'utf8' }).trim()

  if (!raw.startsWith('xkeysib-')) {
    throw new Error('Azure no tiene una API key de Brevo')
  }

  return raw
}

test.describe('Entrega de correo con Brevo', () => {
  test('DomusCond envía y el destinatario recibe el correo de cuenta', async ({ request }) => {
    test.skip(process.env.E2E_TARGET !== 'azure', 'El envío real de correo solo está activo en Azure')
    test.setTimeout(180000)

    const started = new Date(Date.now() - 15_000)
    const password = `Dc.${Date.now().toString(36)}Aa1!`
    const register = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: RECIPIENT,
        password,
        firstName: 'Contacto',
        lastName: 'DomusCond',
        phoneNumber: '5512345678'
      }
    })

    let createdUserId: string | undefined
    let subject = 'Restablece tu contraseña en DomusCond'
    if (register.ok()) {
      createdUserId = unwrapData<{ userId: string }>(await register.json()).userId
      subject = 'Confirma tu correo en DomusCond'
    } else {
      expect((await request.post(`${API_BASE}/auth/forgot-password`, { data: { email: RECIPIENT } })).ok()).toBeTruthy()
    }

    const apiKey = brevoApiKey()
    let delivered = false
    const deadline = Date.now() + 90_000
    try {
      while (Date.now() < deadline) {
        const response = await request.get(
          `https://api.brevo.com/v3/smtp/statistics/events?email=${encodeURIComponent(RECIPIENT)}&limit=20&sort=desc`,
          { headers: { 'api-key': apiKey, accept: 'application/json' } }
        )
        expect(response.ok()).toBeTruthy()
        const payload = await response.json() as { events?: Array<{ date?: string; subject?: string; event?: string; email?: string }> }
        const recent = (payload.events ?? []).filter(item =>
          item.email?.toLowerCase() === RECIPIENT
          && item.subject === subject
          && item.date
          && new Date(item.date) >= started
        )
        if (recent.some(item => item.event === 'hardBounce' || item.event === 'blocked' || item.event === 'invalid')) {
          throw new Error(`Brevo no pudo entregar ${subject} a ${RECIPIENT}`)
        }
        if (recent.some(item => item.event === 'delivered')) {
          delivered = true
          break
        }
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    } finally {
      if (createdUserId) {
        const admin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
        await request.delete(`${API_BASE}/auth/users/${createdUserId}`, {
          headers: { Authorization: `Bearer ${admin.token}` }
        })
      }
    }

    expect(delivered).toBeTruthy()
  })
})