import { expect, test, type APIRequestContext } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, loginUI, registerConfirmedUser, uniqueEmail, unwrapData } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'
import { createAdminCondominiumScenario, type AdminCondominiumScenario } from './helpers/condominium'
import { ensureCondominiumRole } from './helpers/sql'

type ResidentScenario = {
  email: string
  password: string
  userId: string
  residentId: string
  unitId: string
  condominiumId: string
}

function asId(payload: unknown): string {
  if (typeof payload === 'string') return payload

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const candidate = record.id
      ?? record.Id
      ?? record.condominiumId
      ?? record.CondominiumId
      ?? record.announcementId
      ?? record.AnnouncementId
      ?? record.forumPostId
      ?? record.ForumPostId
    if (typeof candidate === 'string') return candidate
  }

  throw new Error(`No se pudo extraer un id del payload: ${JSON.stringify(payload)}`)
}

async function createResidentAndRegisterUser(
  request: APIRequestContext,
  superToken: string,
  unitId: string,
  prefix: string
): Promise<ResidentScenario> {
  const profile = buildScenarioProfile(prefix)
  const email = uniqueEmail(prefix)
  const password = 'Pass123.'

  const createResident = await request.post(`${API_BASE}/residents`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: {
      unitId,
      firstName: profile.residentFirstName,
      lastName: profile.residentLastName,
      email,
      phoneNumber: '5512345678',
      type: 'Owner'
    }
  })
  expect(createResident.status()).toBe(201)
  const residentPayload = unwrapData<any>(await createResident.json())
  const residentId = residentPayload?.id as string | undefined
  expect(residentId).toBeTruthy()

  const inviteResponse = await request.post(`${API_BASE}/residents/${residentId}/invite`, {
    headers: { Authorization: `Bearer ${superToken}` }
  })
  expect(inviteResponse.ok()).toBeTruthy()
  const invitePayload = unwrapData<any>(await inviteResponse.json())
  const invitationToken = invitePayload?.token as string | undefined
  expect(invitationToken).toBeTruthy()

  await registerConfirmedUser(request, {
    email,
    password,
    firstName: profile.residentFirstName,
    lastName: profile.residentLastName,
    invitationToken
  })

  const residentLogin = await loginAPI(request, email, password)
  const residentInfoResponse = await request.get(`${API_BASE}/residents/by-user/${residentLogin.userId}`, {
    headers: { Authorization: `Bearer ${residentLogin.token}` }
  })
  expect(residentInfoResponse.ok()).toBeTruthy()
  const residentInfo = unwrapData<any>(await residentInfoResponse.json())

  return {
    email,
    password,
    userId: residentLogin.userId,
    residentId: residentId!,
    unitId: residentInfo.unitId as string,
    condominiumId: residentInfo.condominiumId as string
  }
}

async function createAnnouncement(
  request: APIRequestContext,
  token: string,
  condominiumId: string,
  overrides: Partial<Record<string, unknown>> = {}
): Promise<string> {
  const profile = buildScenarioProfile('communications.announcement')
  const response = await request.post(`${API_BASE}/communications/announcements`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      title: `Aviso general ${profile.readableLabel}`,
      content: 'Contenido informativo para validar avisos y segmentacion.',
      type: 0,
      priority: 1,
      publishImmediately: false,
      ...overrides
    }
  })

  expect(response.status()).toBe(201)
  return asId(await response.json())
}

async function getAnnouncementDetail(request: APIRequestContext, token: string, announcementId: string) {
  const response = await request.get(`${API_BASE}/communications/announcements/${announcementId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(response.ok()).toBeTruthy()
  return unwrapData<any>(await response.json())
}

async function getPublishedAnnouncements(request: APIRequestContext, token: string, condominiumId: string) {
  const response = await request.get(`${API_BASE}/communications/announcements/published/${condominiumId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(response.ok()).toBeTruthy()
  return unwrapData<any>(await response.json())
}

async function createForumPost(
  request: APIRequestContext,
  token: string,
  condominiumId: string,
  authorId: string,
  authorName: string
): Promise<string> {
  const profile = buildScenarioProfile('communications.forum')
  const response = await request.post(`${API_BASE}/communications/forum`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      authorId,
      authorUnitId: null,
      authorName,
      title: `Foro vecinal ${profile.readableLabel}`,
      content: 'Espacio de conversacion para validar comentarios y moderacion.',
      category: 0,
      allowComments: true
    }
  })

  expect(response.status()).toBe(201)
  return asId(await response.json())
}

async function getForumPostDetail(request: APIRequestContext, token: string, forumPostId: string) {
  const response = await request.get(`${API_BASE}/communications/forum/${forumPostId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(response.ok()).toBeTruthy()
  return unwrapData<any>(await response.json())
}

async function addForumComment(
  request: APIRequestContext,
  token: string,
  forumPostId: string,
  authorId: string,
  authorName: string,
  content: string,
  parentCommentId?: string
): Promise<string> {
  const response = await request.post(`${API_BASE}/communications/forum/${forumPostId}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      authorId,
      authorName,
      content,
      parentCommentId: parentCommentId ?? null
    }
  })

  expect(response.ok()).toBeTruthy()
  return asId(await response.json())
}

async function grantUserPermission(request: APIRequestContext, superToken: string, userId: string, permissionCode: string) {
  const response = await request.post(`${API_BASE}/permissions/user/${userId}/grant`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: { permissionCode }
  })
  expect(response.ok()).toBeTruthy()
}

async function revokeUserPermission(request: APIRequestContext, superToken: string, userId: string, permissionCode: string) {
  const response = await request.post(`${API_BASE}/permissions/user/${userId}/revoke`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: { permissionCode }
  })
  expect(response.ok()).toBeTruthy()
}

async function checkPermission(request: APIRequestContext, token: string, userId: string, permissionCode: string, condominiumId?: string) {
  const query = condominiumId ? `?condominiumId=${condominiumId}` : ''
  const response = await request.get(`${API_BASE}/permissions/user/${userId}/check/${permissionCode}${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(response.ok()).toBeTruthy()
  return (await response.json()) as { hasPermission: boolean }
}

async function assignSubAdminToCondominium(userId: string, condominiumId: string) {
  await ensureCondominiumRole(userId, condominiumId, 2)
}

test.describe('Communications business rules', () => {
  test('API: announcements support segmentation, attachments, read tracking, and publish lifecycle', async ({ request }) => {
    const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const primary: AdminCondominiumScenario = await createAdminCondominiumScenario(request, 'communications.primary')
    const secondary: AdminCondominiumScenario = await createAdminCondominiumScenario(request, 'communications.secondary')
    const resident = await createResidentAndRegisterUser(request, superadmin.token, primary.unitId, 'resident.communications.announcements')

    const draftAnnouncementId = await createAnnouncement(request, superadmin.token, primary.condominiumId, {
      title: 'Aviso segmentado para propietarios',
      type: 0,
      priority: 2
    })

    const circularAnnouncementId = await createAnnouncement(request, superadmin.token, secondary.condominiumId, {
      title: 'Circular operativa del segundo condominio',
      content: 'Circular exclusiva del segundo condominio',
      type: 1,
      priority: 1,
      publishImmediately: true
    })

    const addAttachment = await request.post(`${API_BASE}/communications/announcements/${draftAnnouncementId}/attachments`, {
      headers: { Authorization: `Bearer ${superadmin.token}` },
      data: {
        fileName: 'reglamento.pdf',
        fileUrl: 'https://files.demo.test/reglamento.pdf',
        contentType: 'application/pdf',
        fileSize: 2048
      }
    })
    expect(addAttachment.ok()).toBeTruthy()

    const draftDetailBeforePublish = await getAnnouncementDetail(request, superadmin.token, draftAnnouncementId)
    expect(draftDetailBeforePublish.attachments).toHaveLength(1)
    expect(draftDetailBeforePublish.attachments[0].fileName).toBe('reglamento.pdf')
    expect(draftDetailBeforePublish.readCount).toBe(0)

    const primaryPublishedBefore = await getPublishedAnnouncements(request, superadmin.token, primary.condominiumId)
    expect(primaryPublishedBefore.items.some((item: any) => item.id === draftAnnouncementId)).toBeFalsy()

    const publishDraft = await request.post(`${API_BASE}/communications/announcements/${draftAnnouncementId}/publish`, {
      headers: { Authorization: `Bearer ${superadmin.token}` }
    })
    expect(publishDraft.status()).toBe(204)

    const primaryPublishedAfter = await getPublishedAnnouncements(request, superadmin.token, primary.condominiumId)
    expect(primaryPublishedAfter.items.some((item: any) => item.id === draftAnnouncementId)).toBeTruthy()

    const secondaryPublished = await getPublishedAnnouncements(request, superadmin.token, secondary.condominiumId)
    expect(secondaryPublished.items.some((item: any) => item.id === circularAnnouncementId)).toBeTruthy()
    expect(secondaryPublished.items.some((item: any) => item.id === draftAnnouncementId)).toBeFalsy()

    const markRead = await request.post(`${API_BASE}/communications/announcements/${draftAnnouncementId}/mark-read`, {
      headers: { Authorization: `Bearer ${superadmin.token}` },
      data: {
        unitId: resident.unitId,
        residentId: resident.residentId
      }
    })
    expect(markRead.status()).toBe(204)

    const draftDetailAfterRead = await getAnnouncementDetail(request, superadmin.token, draftAnnouncementId)
    expect(draftDetailAfterRead.readCount).toBe(1)

    const unpublishDraft = await request.post(`${API_BASE}/communications/announcements/${draftAnnouncementId}/unpublish`, {
      headers: { Authorization: `Bearer ${superadmin.token}` }
    })
    expect(unpublishDraft.status()).toBe(204)

    const primaryPublishedAfterUnpublish = await getPublishedAnnouncements(request, superadmin.token, primary.condominiumId)
    expect(primaryPublishedAfterUnpublish.items.some((item: any) => item.id === draftAnnouncementId)).toBeFalsy()
  })

  test('API: forum supports comments, replies, and moderation lifecycle', async ({ request }) => {
    const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const scenario: AdminCondominiumScenario = await createAdminCondominiumScenario(request, 'communications.forum')
    const resident = await createResidentAndRegisterUser(request, superadmin.token, scenario.unitId, 'resident.communications.forum')

    const forumPostId = await createForumPost(
      request,
      superadmin.token,
      scenario.condominiumId,
      resident.userId,
      'Residente Foro'
    )

    const rootCommentId = await addForumComment(
      request,
      superadmin.token,
      forumPostId,
      resident.userId,
      'Residente del foro',
      'Comentario inicial sobre convivencia vecinal'
    )

    const replyCommentId = await addForumComment(
      request,
      superadmin.token,
      forumPostId,
      superadmin.userId,
      'Administracion general',
      'Respuesta de moderacion a la consulta',
      rootCommentId
    )

    const detailWithComments = await getForumPostDetail(request, superadmin.token, forumPostId)
    expect(detailWithComments.comments).toHaveLength(1)
    expect(detailWithComments.comments[0].id).toBe(rootCommentId)
    expect(detailWithComments.comments[0].replies).toHaveLength(1)
    expect(detailWithComments.comments[0].replies[0].id).toBe(replyCommentId)

    const hideComment = await request.post(`${API_BASE}/communications/forum/comments/${rootCommentId}/hide`, {
      headers: { Authorization: `Bearer ${superadmin.token}` }
    })
    expect(hideComment.status()).toBe(204)

    const detailWithHiddenComment = await getForumPostDetail(request, superadmin.token, forumPostId)
    expect(detailWithHiddenComment.comments[0].isHidden).toBeTruthy()

    const showComment = await request.post(`${API_BASE}/communications/forum/comments/${rootCommentId}/show`, {
      headers: { Authorization: `Bearer ${superadmin.token}` }
    })
    expect(showComment.status()).toBe(204)

    const detailWithVisibleComment = await getForumPostDetail(request, superadmin.token, forumPostId)
    expect(detailWithVisibleComment.comments[0].isHidden).toBeFalsy()

    const hidePost = await request.post(`${API_BASE}/communications/forum/${forumPostId}/hide`, {
      headers: { Authorization: `Bearer ${superadmin.token}` }
    })
    expect(hidePost.status()).toBe(204)

    const hiddenPostDetail = await getForumPostDetail(request, superadmin.token, forumPostId)
    expect(hiddenPostDetail.status).toBe(2)

    const restorePost = await request.post(`${API_BASE}/communications/forum/${forumPostId}/restore`, {
      headers: { Authorization: `Bearer ${superadmin.token}` }
    })
    expect(restorePost.status()).toBe(204)

    const restoredPostDetail = await getForumPostDetail(request, superadmin.token, forumPostId)
    expect(restoredPostDetail.status).toBe(0)
  })

  test('API: communications permissions reflect role-specific access', async ({ request }) => {
    const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const scenario: AdminCondominiumScenario = await createAdminCondominiumScenario(request, 'communications.permissions')

    const draftAnnouncementId = await createAnnouncement(request, superadmin.token, scenario.condominiumId, {
      title: 'Aviso para validacion de permisos',
      content: 'Borrador para validar permisos internos',
      type: 0,
      priority: 1
    })
    expect(draftAnnouncementId).toBeTruthy()

    const subAdmin = await registerConfirmedUser(request, {
      email: uniqueEmail('communications.subadmin'),
      firstName: 'Lucia',
      lastName: 'Benitez',
      role: 'SubAdmin'
    })
    const subAdminLogin = await loginAPI(request, subAdmin.email, subAdmin.password)
    await assignSubAdminToCondominium(subAdminLogin.userId, scenario.condominiumId)
    await grantUserPermission(request, superadmin.token, subAdminLogin.userId, 'communications.view_announcements')

    await revokeUserPermission(request, superadmin.token, subAdminLogin.userId, 'communications.create_announcements')
    await revokeUserPermission(request, superadmin.token, subAdminLogin.userId, 'communications.view_polls')
    await revokeUserPermission(request, superadmin.token, subAdminLogin.userId, 'communications.view_meetings')

    const subAdminCanViewAnnouncements = await checkPermission(request, superadmin.token, subAdminLogin.userId, 'communications.view_announcements', scenario.condominiumId)
    const subAdminCanCreateAnnouncements = await checkPermission(request, superadmin.token, subAdminLogin.userId, 'communications.create_announcements', scenario.condominiumId)
    const subAdminCanPublishAnnouncements = await checkPermission(request, superadmin.token, subAdminLogin.userId, 'communications.publish_announcements', scenario.condominiumId)
    const subAdminCanModerateForum = await checkPermission(request, superadmin.token, subAdminLogin.userId, 'communications.moderate_forum', scenario.condominiumId)

    expect(subAdminCanViewAnnouncements.hasPermission).toBeTruthy()
    expect(subAdminCanCreateAnnouncements.hasPermission).toBeFalsy()
    expect(subAdminCanPublishAnnouncements.hasPermission).toBeFalsy()
    expect(subAdminCanModerateForum.hasPermission).toBeFalsy()

    const adminLogin = await loginAPI(request, scenario.adminEmail, scenario.adminPassword)
    const adminCanPublishAnnouncements = await checkPermission(request, superadmin.token, adminLogin.userId, 'communications.publish_announcements', scenario.condominiumId)
    const adminCanModerateForum = await checkPermission(request, superadmin.token, adminLogin.userId, 'communications.moderate_forum', scenario.condominiumId)

    expect(adminCanPublishAnnouncements.hasPermission).toBeTruthy()
    expect(adminCanModerateForum.hasPermission).toBeTruthy()

  })
})
