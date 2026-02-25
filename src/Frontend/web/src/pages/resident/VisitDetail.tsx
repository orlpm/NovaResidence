import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  visitService, 
  VisitStatus, 
  type VisitDetailDto 
} from '../../lib/visitService'
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  LogIn, 
  LogOut, 
  User, 
  Phone, 
  Mail, 
  Car, 
  Calendar, 
  FileText, 
  Users, 
  Shield,
  Ban
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [visit, setVisit] = useState<VisitDetailDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadVisit()
  }, [id])

  const loadVisit = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await visitService.getById(id)
      setVisit(data)
    } catch (error: any) {
      console.error('Error loading visit:', error)
      toast.error('Error al cargar la visita')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!visit) return
    try {
      await visitService.cancel(visit.id)
      toast.success('Visita cancelada')
      loadVisit()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al cancelar')
    }
  }

  const getStatusConfig = (status: VisitStatus) => {
    switch (status) {
      case VisitStatus.Pending: return { icon: <Clock className="w-6 h-6" />, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Pendiente' }
      case VisitStatus.Approved: return { icon: <CheckCircle className="w-6 h-6" />, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Aprobada' }
      case VisitStatus.Rejected: return { icon: <XCircle className="w-6 h-6" />, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Rechazada' }
      case VisitStatus.CheckedIn: return { icon: <LogIn className="w-6 h-6" />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'En el Sitio' }
      case VisitStatus.CheckedOut: return { icon: <LogOut className="w-6 h-6" />, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', label: 'Finalizada' }
      case VisitStatus.Cancelled: return { icon: <Ban className="w-6 h-6" />, color: 'text-gray-500 dark:text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', label: 'Cancelada' }
      case VisitStatus.Expired: return { icon: <Clock className="w-6 h-6" />, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Expirada' }
      default: return { icon: <Clock className="w-6 h-6" />, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Desconocido' }
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    )
  }

  if (!visit) return null

  const statusConfig = getStatusConfig(visit.status)

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/resident/visits')}
          className="flex items-center gap-2 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 mb-4 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a Mis Visitas
        </button>
      </div>

      {/* Status Banner */}
      <div className={`${statusConfig.bg} rounded-2xl p-6 mb-6 flex items-center gap-4`}>
        <div className={statusConfig.color}>{statusConfig.icon}</div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{visit.visitorName}</h1>
          <p className={`text-lg font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
        </div>
      </div>

      {/* Rejection reason */}
      {visit.status === VisitStatus.Rejected && visit.rejectionReason && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Motivo del rechazo:</p>
          <p className="text-red-600 dark:text-red-400">{visit.rejectionReason}</p>
        </div>
      )}

      {/* Visitor Details */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-sky-500" />
          Información del Visitante
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Nombre</span>
            <p className="font-semibold text-gray-900 dark:text-white">{visit.visitorName}</p>
          </div>
          {visit.visitorPhone && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</span>
              <p className="font-semibold text-gray-900 dark:text-white">{visit.visitorPhone}</p>
            </div>
          )}
          {visit.visitorEmail && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
              <p className="font-semibold text-gray-900 dark:text-white">{visit.visitorEmail}</p>
            </div>
          )}
          {visit.visitorIdentification && (
            <div>
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><FileText className="w-3 h-3" /> Identificación</span>
              <p className="font-semibold text-gray-900 dark:text-white">{visit.visitorIdentification}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" /> Personas</span>
            <p className="font-semibold text-gray-900 dark:text-white">{visit.visitorCount}</p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Tipo</span>
            <p className="font-semibold text-gray-900 dark:text-white">{visit.typeName}</p>
          </div>
        </div>
      </div>

      {/* Vehicle Info */}
      {(visit.vehiclePlate || visit.vehicleDescription) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-sky-500" />
            Vehículo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {visit.vehiclePlate && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Placa</span>
                <p className="font-semibold text-gray-900 dark:text-white text-lg">{visit.vehiclePlate}</p>
              </div>
            )}
            {visit.vehicleDescription && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Descripción</span>
                <p className="font-semibold text-gray-900 dark:text-white">{visit.vehicleDescription}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-500" />
          Horario
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Llegada Esperada</span>
            <p className="font-semibold text-gray-900 dark:text-white">
              {new Date(visit.expectedArrival).toLocaleString('es-ES', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
              })}
            </p>
          </div>
          {visit.expectedDeparture && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Salida Esperada</span>
              <p className="font-semibold text-gray-900 dark:text-white">
                {new Date(visit.expectedDeparture).toLocaleString('es-ES', { 
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                })}
              </p>
            </div>
          )}
          {visit.checkInAt && (
            <div>
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><LogIn className="w-3 h-3" /> Entrada Real</span>
              <p className="font-semibold text-green-700 dark:text-green-300">
                {new Date(visit.checkInAt).toLocaleString('es-ES')}
              </p>
            </div>
          )}
          {visit.checkOutAt && (
            <div>
              <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1"><LogOut className="w-3 h-3" /> Salida Real</span>
              <p className="font-semibold text-blue-700 dark:text-blue-300">
                {new Date(visit.checkOutAt).toLocaleString('es-ES')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Purpose & Notes */}
      {(visit.purpose || visit.notes) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" />
            Detalles
          </h2>
          {visit.purpose && (
            <div className="mb-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Motivo</span>
              <p className="font-semibold text-gray-900 dark:text-white">{visit.purpose}</p>
            </div>
          )}
          {visit.notes && (
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Notas</span>
              <p className="text-gray-700 dark:text-gray-300">{visit.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Approval Info */}
      {visit.approvedAt && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">
              Aprobada el {new Date(visit.approvedAt).toLocaleString('es-ES')}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      {(visit.status === VisitStatus.Pending || visit.status === VisitStatus.Approved) && (
        <div className="flex gap-4">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-6 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
          >
            Cancelar Visita
          </button>
        </div>
      )}
    </div>
  )
}
