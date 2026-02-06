import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react'
import { 
  notificationsService, 
  NotificationDto, 
  NotificationSummaryDto,
  getNotificationIcon,
  getNotificationActionUrl,
  formatRelativeTime,
  NotificationPriority
} from '../lib/notificationsService'
import { useAuthStore } from '../stores/authStore'

interface NotificationBellProps {
  condominiumId: string
  isAdmin?: boolean
}

export function NotificationBell({ condominiumId, isAdmin = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [summary, setSummary] = useState<NotificationSummaryDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch notification summary
  const fetchSummary = async () => {
    if (!user?.id || !condominiumId) return
    
    try {
      setLoading(true)
      const data = await notificationsService.getNotificationSummary(user.id, condominiumId, 8)
      setSummary(data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchSummary()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSummary, 30000)
    return () => clearInterval(interval)
  }, [user?.id, condominiumId])

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchSummary()
    }
  }, [isOpen])

  const handleNotificationClick = async (notification: NotificationDto) => {
    if (!user?.id) return

    // Mark as read
    if (!notification.isRead) {
      try {
        await notificationsService.markAsRead(notification.id, user.id)
        fetchSummary() // Refresh
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Navigate to related content
    const url = getNotificationActionUrl(notification, isAdmin)
    setIsOpen(false)
    navigate(url)
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id || !condominiumId) return
    
    try {
      setMarkingAllRead(true)
      await notificationsService.markAllAsRead(user.id, condominiumId)
      await fetchSummary()
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setMarkingAllRead(false)
    }
  }

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    if (!user?.id) return
    
    try {
      await notificationsService.deleteNotification(notificationId, user.id)
      await fetchSummary()
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.Urgent:
        return 'border-l-red-500'
      case NotificationPriority.High:
        return 'border-l-orange-500'
      case NotificationPriority.Normal:
        return 'border-l-sky-500'
      default:
        return 'border-l-gray-300 dark:border-l-gray-600'
    }
  }

  const unreadCount = summary?.unreadCount || 0

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-lg animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600">
            <div>
              <h3 className="font-semibold text-white">Notificaciones</h3>
              <p className="text-xs text-sky-100">
                {unreadCount > 0 
                  ? `${unreadCount} sin leer`
                  : 'Todo al día'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllRead}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Marcar todo como leído"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && !summary ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargando...</p>
              </div>
            ) : summary?.recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Sin notificaciones</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Te avisaremos cuando haya algo nuevo
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {summary?.recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`
                      flex items-start gap-3 p-4 cursor-pointer transition-all
                      border-l-4 ${getPriorityColor(notification.priority)}
                      ${notification.isRead 
                        ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800' 
                        : 'bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30'
                      }
                    `}
                  >
                    {/* Icon */}
                    <div className={`
                      flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg
                      ${notification.isRead 
                        ? 'bg-gray-100 dark:bg-gray-800' 
                        : 'bg-sky-100 dark:bg-sky-900/50'
                      }
                    `}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${
                          notification.isRead 
                            ? 'text-gray-700 dark:text-gray-300' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 bg-sky-500 rounded-full mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {summary && summary.totalCount > 0 && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => {
                  setIsOpen(false)
                  navigate(isAdmin ? '/admin/notifications' : '/resident/notifications')
                }}
                className="w-full py-2 text-sm font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
              >
                Ver todas las notificaciones ({summary.totalCount})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
