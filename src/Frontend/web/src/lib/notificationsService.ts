import { apiClient } from './apiClient'

// Enums
export enum NotificationType {
  Announcement = 0,
  Poll = 1,
  Meeting = 2,
  ForumPost = 3,
  ForumComment = 4,
  PaymentReminder = 5,
  PaymentReceived = 6,
  IncidentUpdate = 7,
  Reservation = 8,
  SystemAlert = 9,
  General = 10
}

export enum NotificationPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Urgent = 3
}

// DTOs
export interface NotificationDto {
  id: string
  condominiumId: string
  userId: string
  unitId?: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  relatedEntityType?: string
  relatedEntityId?: string
  actionUrl?: string
  isRead: boolean
  readAt?: string
  createdAt: string
  expiresAt?: string
}

export interface NotificationSummaryDto {
  totalCount: number
  unreadCount: number
  recentNotifications: NotificationDto[]
}

export interface PagedList<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

// Helper function to get notification icon based on type
export const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.Announcement:
      return '📢'
    case NotificationType.Poll:
      return '📊'
    case NotificationType.Meeting:
      return '📅'
    case NotificationType.ForumPost:
      return '💬'
    case NotificationType.ForumComment:
      return '💬'
    case NotificationType.PaymentReminder:
      return '💳'
    case NotificationType.PaymentReceived:
      return '✅'
    case NotificationType.IncidentUpdate:
      return '🔧'
    case NotificationType.Reservation:
      return '📋'
    case NotificationType.SystemAlert:
      return '⚠️'
    default:
      return '🔔'
  }
}

const roleRoots = new Set(['resident', 'admin', 'subadmin', 'security', 'maintenance', 'cleaning', 'accountant', 'provider', 'superadmin'])

function normalizeBasePath(basePath: string): string {
  return basePath.startsWith('/') ? basePath : `/${basePath}`
}

function retargetStoredUrl(url: string, basePath: string): string {
  const [path, query] = url.split('?')
  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0 || !roleRoots.has(segments[0])) return url

  segments[0] = basePath.slice(1)
  if ((segments[0] === 'admin' || segments[0] === 'subadmin' || segments[0] === 'accountant') && segments[1] === 'payments') {
    segments[1] = 'billing'
  }

  const next = `/${segments.join('/')}`
  return query ? `${next}?${query}` : next
}

function resourceUrl(notification: NotificationDto, basePath: string): string | null {
  const entity = (notification.relatedEntityType || '').toLowerCase()
  const id = notification.relatedEntityId
  const isOffice = basePath === '/admin' || basePath === '/subadmin'
  const isAccountant = basePath === '/accountant'

  if (entity === 'incident') {
    if (basePath === '/resident' && id) return `${basePath}/incidents/${id}`
    if (isOffice && id) return `${basePath}/incidents?id=${id}`
    return `${basePath}/incidents`
  }

  if (entity === 'payment' || entity === 'charge') {
    if (isOffice || isAccountant) return `${isAccountant ? '/accountant' : basePath}/billing${id ? `?paymentId=${id}` : ''}`
    return `${basePath}/payments`
  }

  if (entity === 'areareservation' || entity === 'reservation') {
    if (basePath === '/resident') return `${basePath}/common-areas`
    if (isOffice && id) return `${basePath}/reservations?id=${id}`
    return `${basePath}/reservations`
  }

  if (entity === 'visit') {
    if (basePath === '/resident' && id) return `${basePath}/visits/${id}`
    if (basePath === '/security') return `${basePath}/access-control`
    if (isOffice) return `${basePath}/visits`
    return basePath
  }

  if (entity === 'package') {
    if (basePath === '/resident' || basePath === '/security') return `${basePath}/packages`
    return basePath
  }

  if (entity === 'resident' && isOffice && id) return `${basePath}/residents?id=${id}`
  if (entity === 'poll') return `${basePath}/communications?tab=polls${id ? `&id=${id}` : ''}`
  if (entity === 'meeting') return `${basePath}/communications?tab=meetings${id ? `&id=${id}` : ''}`
  if (entity === 'announcement') return `${basePath}/communications?tab=announcements${id ? `&id=${id}` : ''}`
  if (entity === 'forumpost' || entity === 'forumcomment') return `${basePath}/communications?tab=forum${id ? `&id=${id}` : ''}`

  return null
}

// Helper function to get action URL based on notification type
export const getNotificationActionUrl = (notification: NotificationDto, basePath: string = '/resident'): string => {
  const normalizedBasePath = normalizeBasePath(basePath)
  const linkedResource = resourceUrl(notification, normalizedBasePath)
  if (linkedResource) return linkedResource
  if (notification.actionUrl) return retargetStoredUrl(notification.actionUrl, normalizedBasePath)

  const paymentPath = normalizedBasePath === '/resident'
    ? `${normalizedBasePath}/payments`
    : `${normalizedBasePath}/billing`

  switch (notification.type) {
    case NotificationType.Announcement:
      return `${normalizedBasePath}/communications?tab=announcements${notification.relatedEntityId ? `&id=${notification.relatedEntityId}` : ''}`
    case NotificationType.Poll:
      return `${normalizedBasePath}/communications?tab=polls${notification.relatedEntityId ? `&id=${notification.relatedEntityId}` : ''}`
    case NotificationType.Meeting:
      return `${normalizedBasePath}/communications?tab=meetings${notification.relatedEntityId ? `&id=${notification.relatedEntityId}` : ''}`
    case NotificationType.ForumPost:
    case NotificationType.ForumComment:
      return `${normalizedBasePath}/communications?tab=forum${notification.relatedEntityId ? `&id=${notification.relatedEntityId}` : ''}`
    case NotificationType.PaymentReminder:
    case NotificationType.PaymentReceived:
      return paymentPath
    case NotificationType.IncidentUpdate:
      return normalizedBasePath === '/resident'
        ? `${normalizedBasePath}/incidents${notification.relatedEntityId ? `/${notification.relatedEntityId}` : ''}`
        : `${normalizedBasePath}/incidents${notification.relatedEntityId ? `?id=${notification.relatedEntityId}` : ''}`
    case NotificationType.Reservation:
      return normalizedBasePath === '/resident'
        ? `${normalizedBasePath}/common-areas`
        : `${normalizedBasePath}/reservations${notification.relatedEntityId ? `?id=${notification.relatedEntityId}` : ''}`
    default:
      return normalizedBasePath
  }
}

// Helper function to format relative time
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Hace un momento'
  if (diffMin < 60) return `Hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`
  if (diffHour < 24) return `Hace ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`
  if (diffDay < 7) return `Hace ${diffDay} ${diffDay === 1 ? 'día' : 'días'}`
  
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// Notifications Service
export const notificationsService = {
  // Get user notifications with pagination and filters
  getUserNotifications: async (
    userId: string,
    condominiumId: string,
    params?: {
      isRead?: boolean
      type?: NotificationType
      page?: number
      pageSize?: number
    }
  ): Promise<PagedList<NotificationDto>> => {
    const searchParams = new URLSearchParams()
    if (params?.isRead !== undefined) searchParams.append('isRead', params.isRead.toString())
    if (params?.type !== undefined) searchParams.append('type', params.type.toString())
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    
    const queryString = searchParams.toString() ? `?${searchParams}` : ''
    const response = await apiClient.get<PagedList<NotificationDto>>(
      `/notifications/user/${userId}/condominium/${condominiumId}${queryString}`
    )
    return response.data
  },

  // Get notification summary (for the bell icon)
  getNotificationSummary: async (
    userId: string,
    condominiumId: string,
    recentCount: number = 5
  ): Promise<NotificationSummaryDto> => {
    const response = await apiClient.get<NotificationSummaryDto>(
      `/notifications/summary/user/${userId}/condominium/${condominiumId}?recentCount=${recentCount}`
    )
    return response.data
  },

  // Get unread count only (lightweight call)
  getUnreadCount: async (userId: string, condominiumId: string): Promise<number> => {
    const response = await apiClient.get<number>(
      `/notifications/unread-count/user/${userId}/condominium/${condominiumId}`
    )
    return response.data
  },

  // Mark a notification as read
  markAsRead: async (notificationId: string, userId: string): Promise<void> => {
    await apiClient.post(`/notifications/${notificationId}/mark-read/user/${userId}`)
  },

  // Mark all notifications as read
  markAllAsRead: async (userId: string, condominiumId: string): Promise<number> => {
    const response = await apiClient.post<number>(
      `/notifications/mark-all-read/user/${userId}/condominium/${condominiumId}`
    )
    return response.data
  },

  // Delete a notification
  deleteNotification: async (notificationId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/notifications/${notificationId}/user/${userId}`)
  },

  // Delete all read notifications
  deleteAllRead: async (userId: string, condominiumId: string): Promise<number> => {
    const response = await apiClient.delete<number>(
      `/notifications/read/user/${userId}/condominium/${condominiumId}`
    )
    return response.data
  }
}

export default notificationsService
