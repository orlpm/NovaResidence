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

// Helper function to get action URL based on notification type
export const getNotificationActionUrl = (notification: NotificationDto, isAdmin: boolean): string => {
  if (notification.actionUrl) return notification.actionUrl

  const basePath = isAdmin ? '/admin' : '/resident'
  
  switch (notification.type) {
    case NotificationType.Announcement:
      return `${basePath}/communications?tab=announcements${notification.relatedEntityId ? `&id=${notification.relatedEntityId}` : ''}`
    case NotificationType.Poll:
      return `${basePath}/communications?tab=polls${notification.relatedEntityId ? `&id=${notification.relatedEntityId}` : ''}`
    case NotificationType.Meeting:
      return `${basePath}/communications?tab=meetings${notification.relatedEntityId ? `&id=${notification.relatedEntityId}` : ''}`
    case NotificationType.ForumPost:
    case NotificationType.ForumComment:
      return `${basePath}/communications?tab=forum${notification.relatedEntityId ? `&id=${notification.relatedEntityId}` : ''}`
    case NotificationType.PaymentReminder:
    case NotificationType.PaymentReceived:
      return `${basePath}/billing`
    case NotificationType.IncidentUpdate:
      return `${basePath}/incidents${notification.relatedEntityId ? `/${notification.relatedEntityId}` : ''}`
    case NotificationType.Reservation:
      return `${basePath}/reservations${notification.relatedEntityId ? `/${notification.relatedEntityId}` : ''}`
    default:
      return basePath
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
