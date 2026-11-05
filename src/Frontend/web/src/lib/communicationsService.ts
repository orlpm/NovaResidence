import { apiClient } from './apiClient'

// ========== ENUMS ==========

export enum AnnouncementType {
  General = 0,
  Notice = 1,
  Circular = 2,
  MeetingMinutes = 3,
  Emergency = 4,
  Maintenance = 5
}

export enum AnnouncementPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Urgent = 3
}

export enum PollType {
  Survey = 0,
  Vote = 1,
  Election = 2
}

export enum PollStatus {
  Draft = 0,
  Active = 1,
  Closed = 2,
  Cancelled = 3
}

export enum MeetingType {
  Ordinary = 0,
  Extraordinary = 1,
  BoardMeeting = 2,
  CommitteeMeeting = 3
}

export enum MeetingStatus {
  Scheduled = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3
}

export enum AttendeeStatus {
  Invited = 0,
  Confirmed = 1,
  Declined = 2,
  Attended = 3,
  NoShow = 4
}

export enum ForumCategory {
  General = 0,
  Maintenance = 1,
  Security = 2,
  Events = 3,
  LostAndFound = 4,
  BuySellRent = 5,
  Suggestions = 6,
  Complaints = 7
}

export enum ForumPostStatus {
  Active = 0,
  Hidden = 1,
  Archived = 2
}

// ========== NAME MAPPINGS (Spanish) ==========

export const announcementTypeNames: Record<AnnouncementType, string> = {
  [AnnouncementType.General]: 'General',
  [AnnouncementType.Notice]: 'Aviso',
  [AnnouncementType.Circular]: 'Circular',
  [AnnouncementType.MeetingMinutes]: 'Acta de Reunión',
  [AnnouncementType.Emergency]: 'Emergencia',
  [AnnouncementType.Maintenance]: 'Mantenimiento'
}

export const announcementPriorityNames: Record<AnnouncementPriority, string> = {
  [AnnouncementPriority.Low]: 'Baja',
  [AnnouncementPriority.Normal]: 'Normal',
  [AnnouncementPriority.High]: 'Alta',
  [AnnouncementPriority.Urgent]: 'Urgente'
}

export const pollTypeNames: Record<PollType, string> = {
  [PollType.Survey]: 'Encuesta',
  [PollType.Vote]: 'Votación',
  [PollType.Election]: 'Elección'
}

export const pollStatusNames: Record<PollStatus, string> = {
  [PollStatus.Draft]: 'Borrador',
  [PollStatus.Active]: 'Activa',
  [PollStatus.Closed]: 'Cerrada',
  [PollStatus.Cancelled]: 'Cancelada'
}

export const meetingTypeNames: Record<MeetingType, string> = {
  [MeetingType.Ordinary]: 'Ordinaria',
  [MeetingType.Extraordinary]: 'Extraordinaria',
  [MeetingType.BoardMeeting]: 'Junta Directiva',
  [MeetingType.CommitteeMeeting]: 'Comité'
}

export const meetingStatusNames: Record<MeetingStatus, string> = {
  [MeetingStatus.Scheduled]: 'Programada',
  [MeetingStatus.InProgress]: 'En Progreso',
  [MeetingStatus.Completed]: 'Completada',
  [MeetingStatus.Cancelled]: 'Cancelada'
}

export const attendeeStatusNames: Record<AttendeeStatus, string> = {
  [AttendeeStatus.Invited]: 'Invitado',
  [AttendeeStatus.Confirmed]: 'Confirmado',
  [AttendeeStatus.Declined]: 'Declinado',
  [AttendeeStatus.Attended]: 'Asistió',
  [AttendeeStatus.NoShow]: 'No Asistió'
}

export const forumCategoryNames: Record<ForumCategory, string> = {
  [ForumCategory.General]: 'General',
  [ForumCategory.Maintenance]: 'Mantenimiento',
  [ForumCategory.Security]: 'Seguridad',
  [ForumCategory.Events]: 'Eventos',
  [ForumCategory.LostAndFound]: 'Objetos Perdidos',
  [ForumCategory.BuySellRent]: 'Compra/Venta/Renta',
  [ForumCategory.Suggestions]: 'Sugerencias',
  [ForumCategory.Complaints]: 'Quejas'
}

export const forumPostStatusNames: Record<ForumPostStatus, string> = {
  [ForumPostStatus.Active]: 'Activo',
  [ForumPostStatus.Hidden]: 'Oculto',
  [ForumPostStatus.Archived]: 'Archivado'
}

// ========== DTOs ==========

// Announcements
export interface AnnouncementAttachmentDto {
  id: string
  fileName: string
  fileUrl: string
  contentType: string
  fileSize: number
}

export interface AnnouncementDto {
  id: string
  condominiumId: string
  title: string
  content: string
  type: AnnouncementType
  typeName: string
  priority: AnnouncementPriority
  priorityName: string
  isPublished: boolean
  publishedAt: string | null
  expiresAt: string | null
  meetingDate: string | null
  meetingLocation: string | null
  attachments: AnnouncementAttachmentDto[]
  isRead: boolean
  readAt: string | null
  createdAt: string
}

// Polls
export interface PollOptionDto {
  id: string
  text: string
  displayOrder: number
  voteCount: number
  percentage: number
  votePercentage?: number
}

function normalizePoll(poll: PollDto): PollDto {
  return {
    ...poll,
    participationPercentage: poll.participationPercentage ?? 0,
    totalEligibleVoters: poll.totalEligibleVoters ?? 0,
    hasQuorum: poll.hasQuorum ?? false,
    hasVoted: poll.hasVoted ?? false,
    votedOptionIds: poll.votedOptionIds ?? [],
    options: (poll.options ?? []).map(option => ({
      ...option,
      percentage: option.percentage ?? option.votePercentage ?? 0
    }))
  }
}

export interface PollDto {
  id: string
  condominiumId: string
  title: string
  description: string
  type: PollType
  typeName: string
  status: PollStatus
  statusName: string
  startDate: string
  endDate: string
  allowMultipleVotes: boolean
  isAnonymous: boolean
  requiresQuorum: boolean
  quorumPercentage: number | null
  totalVotes: number
  totalEligibleVoters: number
  participationPercentage: number
  hasQuorum: boolean
  options: PollOptionDto[]
  hasVoted: boolean
  votedOptionIds: string[]
  createdAt: string
}

export interface PollResultsDto {
  pollId: string
  title: string
  totalVotes: number
  totalEligibleVoters: number
  participationPercentage: number
  hasQuorum: boolean
  requiredQuorumPercentage: number | null
  options: PollOptionDto[]
}

// Meetings
export interface MeetingAttendeeDto {
  id: string
  unitId: string
  unitNumber: string
  residentId: string | null
  residentName: string
  status: AttendeeStatus
  statusName: string
  hasProxy: boolean
  proxyName: string | null
  arrivedAt: string | null
}

export interface MeetingDto {
  id: string
  condominiumId: string
  title: string
  description: string
  type: MeetingType
  typeName: string
  status: MeetingStatus
  statusName: string
  scheduledDate: string
  location: string | null
  virtualMeetingUrl: string | null
  agenda: string | null
  minutes: string | null
  startedAt: string | null
  endedAt: string | null
  requiredQuorumPercentage: number
  attendees: MeetingAttendeeDto[]
  createdAt: string
}

export interface MeetingQuorumDto {
  meetingId: string
  totalUnits: number
  invitedUnits: number
  confirmedUnits: number
  attendedUnits: number
  requiredQuorumPercentage: number
  currentQuorumPercentage: number
  hasQuorum: boolean
}

// Forum
export interface ForumCommentDto {
  id: string
  authorId: string
  authorName: string
  content: string
  isHidden: boolean
  parentCommentId: string | null
  replies: ForumCommentDto[]
  createdAt: string
  updatedAt: string | null
}

export interface ForumPostAttachmentDto {
  id: string
  fileName: string
  fileUrl: string
  contentType: string
  fileSize: number
}

export interface ForumPostDto {
  id: string
  condominiumId: string
  authorId: string
  authorUnitId: string | null
  authorName: string
  title: string
  content: string
  category: ForumCategory
  categoryName: string
  status: ForumPostStatus
  statusName: string
  isPinned: boolean
  pinnedUntil: string | null
  allowComments: boolean
  viewCount: number
  commentCount: number
  createdAt: string
  updatedAt: string | null
}

export interface ForumPostDetailDto extends ForumPostDto {
  attachments: ForumPostAttachmentDto[]
  comments: ForumCommentDto[]
}

// Paged list
export interface PagedList<T> {
  items: T[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

// ========== REQUEST DTOs ==========

export interface CreateAnnouncementRequest {
  condominiumId: string
  title: string
  content: string
  type: AnnouncementType
  priority: AnnouncementPriority
  expiresAt?: string | null
  meetingDate?: string | null
  meetingLocation?: string | null
  publishImmediately?: boolean
}

export interface UpdateAnnouncementRequest {
  title: string
  content: string
  type: AnnouncementType
  priority: AnnouncementPriority
  expiresAt?: string | null
  meetingDate?: string | null
  meetingLocation?: string | null
}

export interface CreatePollRequest {
  condominiumId: string
  title: string
  description: string
  type: PollType
  startDate: string
  endDate: string
  options: string[]
  allowMultipleVotes?: boolean
  isAnonymous?: boolean
  requiresQuorum?: boolean
  quorumPercentage?: number | null
}

export interface UpdatePollRequest {
  title: string
  description: string
  startDate: string
  endDate: string
}

export interface CastVoteRequest {
  optionId: string
  unitId: string
  residentId?: string | null
}

export interface CreateMeetingRequest {
  condominiumId: string
  title: string
  description: string
  type: MeetingType
  scheduledDate: string
  location?: string | null
  virtualMeetingUrl?: string | null
  agenda?: string | null
  requiredQuorumPercentage?: number
}

export interface UpdateMeetingRequest {
  title: string
  description: string
  scheduledDate: string
  location?: string | null
  virtualMeetingUrl?: string | null
  agenda?: string | null
}

export interface InviteAttendeeRequest {
  unitId: string
  residentId?: string | null
  residentName?: string | null
}

export interface CreateForumPostRequest {
  condominiumId: string
  authorId: string
  authorUnitId?: string | null
  authorName: string
  title: string
  content: string
  category: ForumCategory
  allowComments?: boolean
}

export interface UpdateForumPostRequest {
  title: string
  content: string
  category: ForumCategory
  allowComments: boolean
}

export interface AddForumCommentRequest {
  authorId: string
  authorName: string
  content: string
  parentCommentId?: string | null
}

// ========== SERVICE ==========

export const communicationsService = {
  // ========== ANNOUNCEMENTS ==========
  
  getAnnouncements: async (
    condominiumId: string,
    params?: {
      type?: AnnouncementType
      priority?: AnnouncementPriority
      isPublished?: boolean
      pageNumber?: number
      pageSize?: number
    }
  ): Promise<PagedList<AnnouncementDto>> => {
    const searchParams = new URLSearchParams()
    if (params?.type !== undefined) searchParams.append('type', params.type.toString())
    if (params?.isPublished !== undefined) searchParams.append('isPublished', params.isPublished.toString())
    if (params?.pageNumber) searchParams.append('page', params.pageNumber.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    
    const queryString = searchParams.toString() ? `?${searchParams}` : ''
    const response = await apiClient.get<PagedList<AnnouncementDto>>(`/communications/announcements/condominium/${condominiumId}${queryString}`)
    return response.data
  },

  getAnnouncementById: async (id: string): Promise<AnnouncementDto> => {
    const response = await apiClient.get<AnnouncementDto>(`/communications/announcements/${id}`)
    return response.data
  },

  uploadAttachment: async (file: File): Promise<{ fileName: string; fileUrl: string; contentType: string; fileSize: number }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<{ fileName: string; fileUrl: string; contentType: string; fileSize: number }>('/communications/upload', formData)
    return response.data
  },

  addAnnouncementAttachment: async (id: string, file: { fileName: string; fileUrl: string; contentType?: string; fileSize: number }): Promise<void> => {
    await apiClient.post(`/communications/announcements/${id}/attachments`, file)
  },

  addForumAttachment: async (id: string, file: { fileName: string; fileUrl: string; contentType?: string; fileSize: number }): Promise<void> => {
    await apiClient.post(`/communications/forum/${id}/attachments`, file)
  },

  createAnnouncement: async (request: CreateAnnouncementRequest): Promise<string> => {
    const response = await apiClient.post<string>('/communications/announcements', request)
    return response.data
  },

  updateAnnouncement: async (id: string, request: UpdateAnnouncementRequest): Promise<void> => {
    await apiClient.put(`/communications/announcements/${id}`, request)
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    await apiClient.delete(`/communications/announcements/${id}`)
  },

  publishAnnouncement: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/announcements/${id}/publish`)
  },

  unpublishAnnouncement: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/announcements/${id}/unpublish`)
  },

  markAnnouncementAsRead: async (id: string, unitId: string, residentId: string): Promise<void> => {
    await apiClient.post(`/communications/announcements/${id}/mark-read`, { unitId, residentId })
  },

  // ========== POLLS ==========

  getPolls: async (
    condominiumId: string,
    params?: {
      status?: PollStatus
      type?: PollType
      pageNumber?: number
      pageSize?: number
    }
  ): Promise<PagedList<PollDto>> => {
    const searchParams = new URLSearchParams()
    if (params?.status !== undefined) searchParams.append('status', params.status.toString())
    if (params?.pageNumber) searchParams.append('page', params.pageNumber.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    
    const queryString = searchParams.toString() ? `?${searchParams}` : ''
    const response = await apiClient.get<PagedList<PollDto>>(`/communications/polls/condominium/${condominiumId}${queryString}`)
    return {
      ...response.data,
      items: (response.data.items || []).map(normalizePoll)
    }
  },

  hasUnitVoted: async (pollId: string, unitId: string): Promise<boolean> => {
    const response = await apiClient.get<boolean>(`/communications/polls/${pollId}/has-voted/${unitId}`)
    return response.data === true
  },

  getPollById: async (id: string, unitId?: string): Promise<PollDto> => {
    const url = unitId 
      ? `/communications/polls/${id}?unitId=${unitId}` 
      : `/communications/polls/${id}`
    const response = await apiClient.get<PollDto>(url)
    return response.data
  },

  getPollResults: async (id: string): Promise<PollResultsDto> => {
    const response = await apiClient.get<PollResultsDto>(`/communications/polls/${id}/results`)
    return response.data
  },

  createPoll: async (request: CreatePollRequest): Promise<string> => {
    const response = await apiClient.post<string>('/communications/polls', request)
    return response.data
  },

  updatePoll: async (id: string, request: UpdatePollRequest): Promise<void> => {
    await apiClient.put(`/communications/polls/${id}`, request)
  },

  deletePoll: async (id: string): Promise<void> => {
    await apiClient.delete(`/communications/polls/${id}`)
  },

  publishPoll: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/polls/${id}/publish`)
  },

  closePoll: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/polls/${id}/close`)
  },

  cancelPoll: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/polls/${id}/cancel`)
  },

  castVote: async (pollId: string, request: CastVoteRequest): Promise<string> => {
    const response = await apiClient.post<string>(`/communications/polls/${pollId}/vote`, request)
    return response.data
  },

  // ========== MEETINGS ==========

  getMeetings: async (
    condominiumId: string,
    params?: {
      status?: MeetingStatus
      type?: MeetingType
      fromDate?: string
      toDate?: string
      pageNumber?: number
      pageSize?: number
    }
  ): Promise<PagedList<MeetingDto>> => {
    const searchParams = new URLSearchParams()
    if (params?.status !== undefined) searchParams.append('status', params.status.toString())
    if (params?.pageNumber) searchParams.append('page', params.pageNumber.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    
    const queryString = searchParams.toString() ? `?${searchParams}` : ''
    const response = await apiClient.get<PagedList<MeetingDto>>(`/communications/meetings/condominium/${condominiumId}${queryString}`)
    return response.data
  },

  getMeetingById: async (id: string): Promise<MeetingDto> => {
    const response = await apiClient.get<MeetingDto>(`/communications/meetings/${id}`)
    return response.data
  },

  getMeetingQuorum: async (id: string): Promise<MeetingQuorumDto> => {
    const response = await apiClient.get<MeetingQuorumDto>(`/communications/meetings/${id}/quorum`)
    return response.data
  },

  createMeeting: async (request: CreateMeetingRequest): Promise<string> => {
    const response = await apiClient.post<string>('/communications/meetings', request)
    return response.data
  },

  updateMeeting: async (id: string, request: UpdateMeetingRequest): Promise<void> => {
    await apiClient.put(`/communications/meetings/${id}`, request)
  },

  deleteMeeting: async (id: string): Promise<void> => {
    await apiClient.delete(`/communications/meetings/${id}`)
  },

  startMeeting: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/meetings/${id}/start`)
  },

  endMeeting: async (id: string, minutes?: string): Promise<void> => {
    await apiClient.post(`/communications/meetings/${id}/end`, { minutes })
  },

  cancelMeeting: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/meetings/${id}/cancel`)
  },

  setMeetingMinutes: async (id: string, minutes: string): Promise<void> => {
    await apiClient.put(`/communications/meetings/${id}/minutes`, { minutes })
  },

  inviteToMeeting: async (meetingId: string, request: InviteAttendeeRequest): Promise<string> => {
    const response = await apiClient.post<string>(`/communications/meetings/${meetingId}/invite`, request)
    return response.data
  },

  confirmMeetingAttendance: async (meetingId: string, attendeeId: string): Promise<void> => {
    await apiClient.post(`/communications/meetings/${meetingId}/attendees/${attendeeId}/confirm`)
  },

  declineMeetingAttendance: async (meetingId: string, attendeeId: string): Promise<void> => {
    await apiClient.post(`/communications/meetings/${meetingId}/attendees/${attendeeId}/decline`)
  },

  markAttendeeArrived: async (meetingId: string, attendeeId: string): Promise<void> => {
    await apiClient.post(`/communications/meetings/${meetingId}/attendees/${attendeeId}/arrived`)
  },

  // ========== FORUM ==========

  getForumPosts: async (
    condominiumId: string,
    params?: {
      category?: ForumCategory
      status?: ForumPostStatus
      authorId?: string
      pageNumber?: number
      pageSize?: number
    }
  ): Promise<PagedList<ForumPostDto>> => {
    const searchParams = new URLSearchParams()
    if (params?.category !== undefined) searchParams.append('category', params.category.toString())
    if (params?.status !== undefined) searchParams.append('status', params.status.toString())
    if (params?.pageNumber) searchParams.append('page', params.pageNumber.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    
    const queryString = searchParams.toString() ? `?${searchParams}` : ''
    const response = await apiClient.get<PagedList<ForumPostDto>>(`/communications/forum/condominium/${condominiumId}${queryString}`)
    return response.data
  },

  getForumPostById: async (id: string): Promise<ForumPostDetailDto> => {
    const response = await apiClient.get<ForumPostDetailDto>(`/communications/forum/${id}`)
    return response.data
  },

  incrementForumPostViews: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/forum/${id}/view`)
  },

  createForumPost: async (request: CreateForumPostRequest): Promise<string> => {
    const response = await apiClient.post<string>('/communications/forum', request)
    return response.data
  },

  updateForumPost: async (id: string, request: UpdateForumPostRequest): Promise<void> => {
    await apiClient.put(`/communications/forum/${id}`, request)
  },

  deleteForumPost: async (id: string): Promise<void> => {
    await apiClient.delete(`/communications/forum/${id}`)
  },

  pinForumPost: async (id: string, until?: string): Promise<void> => {
    await apiClient.post(`/communications/forum/${id}/pin`, { until })
  },

  unpinForumPost: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/forum/${id}/unpin`)
  },

  archiveForumPost: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/forum/${id}/archive`)
  },

  hideForumPost: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/forum/${id}/hide`)
  },

  restoreForumPost: async (id: string): Promise<void> => {
    await apiClient.post(`/communications/forum/${id}/restore`)
  },

  addForumComment: async (postId: string, request: AddForumCommentRequest): Promise<string> => {
    const response = await apiClient.post<string>(`/communications/forum/${postId}/comments`, request)
    return response.data
  },

  updateForumComment: async (commentId: string, content: string): Promise<void> => {
    await apiClient.put(`/communications/forum/comments/${commentId}`, { content })
  },

  deleteForumComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/communications/forum/comments/${commentId}`)
  }
}
