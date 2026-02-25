import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { incidentService, type IncidentDetailDto, IncidentPriority, IncidentStatus } from '../../lib/incidentService'
import toast from 'react-hot-toast'

function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [incident, setIncident] = useState<IncidentDetailDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadIncident = async () => {
      if (!id) {
        toast.error('Incidencia no válida')
        navigate('/resident/incidents')
        return
      }

      setLoading(true)
      try {
        const detail = await incidentService.getById(id)
        setIncident(detail)
      } catch {
        toast.error('No se pudo cargar el detalle de la incidencia')
        navigate('/resident/incidents')
      } finally {
        setLoading(false)
      }
    }

    loadIncident()
  }, [id, navigate])

  const getStatusColor = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.Closed:
      case IncidentStatus.Resolved:
        return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
      case IncidentStatus.Open:
      case IncidentStatus.Reopened:
        return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
      case IncidentStatus.InProgress:
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      default:
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
    }
  }

  const getPriorityColor = (priority: IncidentPriority) => {
    switch (priority) {
      case IncidentPriority.Urgent:
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      case IncidentPriority.High:
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
      case IncidentPriority.Medium:
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case IncidentPriority.Low:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getAttachmentUrl = (fileUrl: string) => {
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl
    const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5001/api'
    const apiBase = apiUrl.replace(/\/api\/?$/, '')
    return `${apiBase}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`
  }

  const isImageAttachment = (contentType: string | null, fileName: string) => {
    if (contentType?.toLowerCase().startsWith('image/')) return true
    return /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(fileName)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando detalle...</p>
        </div>
      </div>
    )
  }

  if (!incident) return null

  const attachments = incident.attachments ?? []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/resident/incidents')}
        className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <ArrowLeftIcon className="w-4 h-4" /> Volver
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{incident.title}</h1>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(incident.status)}`}>
              {incident.statusName}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(incident.priority)}`}>
              {incident.priorityName}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">Tipo</p>
            <p className="text-gray-900 dark:text-white font-medium">{incident.typeName}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">Creada</p>
            <p className="text-gray-900 dark:text-white font-medium">{new Date(incident.createdAt).toLocaleString('es-ES')}</p>
          </div>
          {incident.location && (
            <div>
              <p className="text-gray-500 dark:text-gray-400">Ubicación</p>
              <p className="text-gray-900 dark:text-white font-medium">{incident.location}</p>
            </div>
          )}
          {incident.assignedToName && (
            <div>
              <p className="text-gray-500 dark:text-gray-400">Asignado a</p>
              <p className="text-gray-900 dark:text-white font-medium">{incident.assignedToName}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Descripción</p>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200">
            {incident.description}
          </div>
        </div>

        {attachments.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              <PaperClipIcon className="w-4 h-4" /> Adjuntos ({attachments.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map((attachment) => {
                const attachmentUrl = getAttachmentUrl(attachment.fileUrl)
                const isImage = isImageAttachment(attachment.contentType, attachment.fileName)

                return (
                  <a
                    key={attachment.id}
                    href={attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    {isImage ? (
                      <img src={attachmentUrl} alt={attachment.fileName} className="w-full h-36 object-cover rounded-md mb-2" />
                    ) : (
                      <div className="w-full h-36 rounded-md mb-2 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <PaperClipIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <p className="text-sm text-gray-900 dark:text-white truncate">{attachment.fileName}</p>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {incident.resolutionNotes && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Notas de resolución</p>
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-gray-800 dark:text-gray-200">
              {incident.resolutionNotes}
            </div>
          </div>
        )}

        {(incident.comments ?? []).length > 0 && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-4 h-4" /> Comentarios ({incident.comments.length})
            </p>
            <div className="space-y-3">
              {incident.comments.map((comment) => (
                <div key={comment.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{comment.userName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.createdAt).toLocaleString('es-ES')}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                  {comment.isInternal && (
                    <span className="text-xs text-yellow-700 dark:text-yellow-400">Interno</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!incident && (
        <div className="text-center py-12 text-red-600 dark:text-red-400">
          <ExclamationTriangleIcon className="w-10 h-10 mx-auto mb-2" />
          No se pudo cargar el detalle
        </div>
      )}
    </div>
  )
}

export default IncidentDetail
