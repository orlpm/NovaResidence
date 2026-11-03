import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, loginUI, unwrapData } from './helpers/auth'
import { asId, createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

function readId(payload: unknown): string {
  if (typeof payload === 'string') return payload
  return asId(unwrapData(payload))
}

async function createPoll(request: APIRequestContext, token: string, condominiumId: string, title: string) {
  const now = new Date()
  const response = await request.post(`${API_BASE}/communications/polls`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      title,
      description: 'Encuesta del escenario de asamblea',
      type: 0,
      startDate: new Date(now.getTime() - 60 * 1000).toISOString(),
      endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      options: ['A favor', 'En contra'],
      allowMultipleVotes: false,
      isAnonymous: false,
      requiresQuorum: false
    }
  })
  expect(response.status()).toBe(201)
  return readId(await response.json())
}

test.describe('Encuestas y asambleas', () => {
  test('el residente vota una encuesta publicada y el admin cierra con resultados', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'poll.flow')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'poll.resident')
    const title = `Encuesta ${buildScenarioProfile('poll.flow').readableLabel}`
    const pollId = await createPoll(request, scenario.adminToken, scenario.condominiumId, title)

    const published = await request.post(`${API_BASE}/communications/polls/${pollId}/publish`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(published.status()).toBe(204)

    const detailResponse = await request.get(`${API_BASE}/communications/polls/${pollId}`, {
      headers: { Authorization: `Bearer ${resident.token}` }
    })
    expect(detailResponse.ok()).toBeTruthy()
    const detail = await detailResponse.json()
    const optionId = detail.options?.[0]?.id as string
    expect(optionId).toBeTruthy()

    const vote = await request.post(`${API_BASE}/communications/polls/${pollId}/vote`, {
      headers: { Authorization: `Bearer ${resident.token}` },
      data: { optionId, unitId: scenario.unitId, residentId: resident.residentId }
    })
    expect(vote.ok()).toBeTruthy()

    const duplicate = await request.post(`${API_BASE}/communications/polls/${pollId}/vote`, {
      headers: { Authorization: `Bearer ${resident.token}` },
      data: { optionId, unitId: scenario.unitId, residentId: resident.residentId }
    })
    expect(duplicate.ok()).toBeFalsy()

    const resultsResponse = await request.get(`${API_BASE}/communications/polls/${pollId}/results`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(resultsResponse.ok()).toBeTruthy()
    const results = await resultsResponse.json()
    expect(results.totalVotes).toBe(1)
    expect(results.options.find((option: { id: string }) => option.id === optionId)?.voteCount).toBe(1)

    const closed = await request.post(`${API_BASE}/communications/polls/${pollId}/close`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(closed.status()).toBe(204)

    const afterClose = await request.get(`${API_BASE}/communications/polls/${pollId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect((await afterClose.json()).statusName?.toString().toLowerCase()).toMatch(/cerrad|closed/)
  })

  test('la asamblea invita, confirma asistencia, alcanza quórum y guarda la minuta', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'meeting.flow')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'meeting.resident')
    const title = `Asamblea ${buildScenarioProfile('meeting.flow').readableLabel}`

    const created = await request.post(`${API_BASE}/communications/meetings`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        title,
        description: 'Asamblea ordinaria del escenario',
        type: 0,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: 'Salón de usos múltiples',
        agenda: 'Estados financieros y áreas comunes',
        requiredQuorumPercentage: 50
      }
    })
    expect(created.status()).toBe(201)
    const meetingId = readId(await created.json())

    const invite = await request.post(`${API_BASE}/communications/meetings/${meetingId}/invite`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        unitId: scenario.unitId,
        residentId: resident.residentId,
        residentName: 'Residente de la unidad'
      }
    })
    expect(invite.ok()).toBeTruthy()
    const attendeeId = readId(await invite.json())

    const confirmed = await request.post(`${API_BASE}/communications/meetings/${meetingId}/attendees/${attendeeId}/confirm`, {
      headers: { Authorization: `Bearer ${resident.token}` }
    })
    expect(confirmed.status()).toBe(204)

    const arrived = await request.post(`${API_BASE}/communications/meetings/${meetingId}/attendees/${attendeeId}/arrived`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(arrived.status()).toBe(204)

    const quorumResponse = await request.get(`${API_BASE}/communications/meetings/${meetingId}/quorum`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(quorumResponse.ok()).toBeTruthy()
    const quorum = await quorumResponse.json()
    expect(quorum.attendedUnits).toBe(1)
    expect(quorum.hasQuorum).toBe(true)

    expect((await request.post(`${API_BASE}/communications/meetings/${meetingId}/start`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })).status()).toBe(204)

    const minutes = 'Se aprobó el mantenimiento de áreas comunes.'
    expect((await request.post(`${API_BASE}/communications/meetings/${meetingId}/end`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: { minutes }
    })).status()).toBe(204)

    const finished = await request.get(`${API_BASE}/communications/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    const meeting = await finished.json()
    expect(meeting.minutes).toBe(minutes)
    expect(meeting.hasQuorum).toBe(true)
  })

  test('un invitado puede rechazar la asistencia', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'meeting.decline')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'meeting.decline.resident')

    const created = await request.post(`${API_BASE}/communications/meetings`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        title: `Asamblea rechazada ${buildScenarioProfile('meeting.decline').readableLabel}`,
        description: 'Segunda convocatoria',
        type: 1,
        scheduledDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        location: 'En línea',
        requiredQuorumPercentage: 100
      }
    })
    const meetingId = readId(await created.json())
    const invite = await request.post(`${API_BASE}/communications/meetings/${meetingId}/invite`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: { unitId: scenario.unitId, residentId: resident.residentId, residentName: 'Residente' }
    })
    const attendeeId = readId(await invite.json())

    expect((await request.post(`${API_BASE}/communications/meetings/${meetingId}/attendees/${attendeeId}/decline`, {
      headers: { Authorization: `Bearer ${resident.token}` }
    })).status()).toBe(204)

    const quorum = await (await request.get(`${API_BASE}/communications/meetings/${meetingId}/quorum`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })).json()
    expect(quorum.attendedUnits).toBe(0)
    expect(quorum.hasQuorum).toBe(false)
  })

  test('el residente vota y confirma la asamblea desde su pantalla', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'comms.ui')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'comms.ui.resident')
    const pollTitle = `Encuesta pantalla ${buildScenarioProfile('comms.ui.poll').readableLabel}`
    const meetingTitle = `Asamblea pantalla ${buildScenarioProfile('comms.ui.meeting').readableLabel}`
    const today = new Date().toISOString().slice(0, 10)
    const end = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const meetingWhen = new Date(Date.now() + 26 * 60 * 60 * 1000)
    const meetingValue = `${meetingWhen.toISOString().slice(0, 11)}${String(meetingWhen.getUTCHours()).padStart(2, '0')}:${String(meetingWhen.getUTCMinutes()).padStart(2, '0')}`

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/communications')
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.getByRole('button', { name: 'Encuestas' }).click()
    await page.getByRole('button', { name: 'Nueva Encuesta' }).click()
    const pollDialog = page.locator('.fixed').filter({ hasText: 'Nueva Encuesta' })
    await pollDialog.locator('input[type="text"]').first().fill(pollTitle)
    await pollDialog.locator('input[type="date"]').nth(0).fill(today)
    await pollDialog.locator('input[type="date"]').nth(1).fill(end)
    await expect(pollDialog.locator('input[type="date"]').nth(0)).toHaveValue(today)
    await expect(pollDialog.locator('input[type="date"]').nth(1)).toHaveValue(end)
    await pollDialog.getByPlaceholder('Opción 1').fill('A favor')
    await pollDialog.getByPlaceholder('Opción 2').fill('En contra')
    const invalidFields = await pollDialog.locator('form').evaluate((form: HTMLFormElement) =>
      Array.from(form.elements)
        .filter((field): field is HTMLInputElement => field instanceof HTMLInputElement && !field.checkValidity())
        .map(field => `${field.type}:${field.validationMessage}`)
    )
    expect(invalidFields, 'el formulario de encuesta debe ser válido').toEqual([])
    const pollResponse = page.waitForResponse(response =>
      response.url().includes('/communications/polls') && response.request().method() === 'POST'
    )
    await pollDialog.getByRole('button', { name: 'Crear' }).click()
    const createdPoll = await pollResponse
    expect(createdPoll.ok()).toBeTruthy()
    await expect(page.getByRole('heading', { name: pollTitle })).toBeVisible({ timeout: 15000 })
    const pollCard = page.locator('div.bg-gray-50').filter({ has: page.getByRole('heading', { name: pollTitle }) })
    await pollCard.getByRole('button', { name: 'Publicar' }).click()
    await expect(page.getByText('Encuesta publicada')).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Reuniones' }).click()
    await page.getByRole('button', { name: 'Nueva Reunión' }).click()
    const meetingDialog = page.locator('.fixed').filter({ hasText: 'Nueva Reunión' })
    await meetingDialog.locator('input[type="text"]').first().fill(meetingTitle)
    await meetingDialog.locator('input[type="datetime-local"]').fill(meetingValue)
    await meetingDialog.getByPlaceholder('Ej: Salón de eventos').fill('Salón de usos múltiples')
    await meetingDialog.getByRole('button', { name: 'Crear' }).click()
    await expect(page.getByText('Reunión creada exitosamente')).toBeVisible({ timeout: 15000 })
    const meetingCard = page.locator('div.bg-gray-50').filter({ has: page.getByRole('heading', { name: meetingTitle }) })
    await meetingCard.getByRole('button', { name: 'Invitar residentes' }).click()
    await expect(page.getByText('Residentes invitados')).toBeVisible({ timeout: 15000 })

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/communications')
    await page.getByRole('button', { name: 'Encuestas' }).click()
    await expect(page.getByText(pollTitle)).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Votar' }).click()
    await page.getByLabel('A favor').check()
    await page.getByRole('button', { name: 'Confirmar Voto' }).click()
    await expect(page.getByText('Voto registrado exitosamente')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Votado')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('100%').first()).toBeVisible()

    await page.getByRole('button', { name: 'Reuniones' }).click()
    await page.getByText(meetingTitle).click()
    await page.getByRole('button', { name: 'Confirmar asistencia' }).click()
    await expect(page.getByText('Asistencia confirmada')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Tu asistencia: Confirmado')).toBeVisible()
  })

  test('el admin redacta el acta y el residente la lee', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'minutes.ui')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'minutes.resident')
    const title = `Asamblea acta ${buildScenarioProfile('minutes.ui').readableLabel}`
    const minutes = 'Se aprobó pintar la fachada.'

    const created = await request.post(`${API_BASE}/communications/meetings`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        title,
        description: 'Asamblea para redactar el acta',
        type: 0,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: 'Salón',
        requiredQuorumPercentage: 50
      }
    })
    expect(created.status()).toBe(201)

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/communications')
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.getByRole('button', { name: 'Reuniones' }).click()
    const meetingCard = page.locator('div.bg-gray-50.rounded-xl').filter({ has: page.getByRole('heading', { name: title }) })
    await expect(meetingCard).toBeVisible({ timeout: 15000 })
    await meetingCard.getByRole('button', { name: 'Redactar acta' }).click()
    const minutesDialog = page.locator('.fixed').filter({ hasText: 'Redactar acta' })
    await minutesDialog.getByPlaceholder('Acuerdos de la asamblea').fill(minutes)
    await minutesDialog.getByRole('button', { name: 'Guardar acta' }).click()
    await expect(page.getByText('Acta guardada')).toBeVisible({ timeout: 15000 })

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/communications')
    await page.getByRole('button', { name: 'Reuniones' }).click()
    await page.getByText(title).click()
    await expect(page.getByText('Acta de la Reunión')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(minutes)).toBeVisible()
  })
})
