import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { 
  visitService, 
  VisitStatus, 
  VisitType,
  type VisitListDto 
} from '../../lib/visitService'
import { 
  Users, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  LogIn, 
  LogOut, 
  ArrowRight,
  Car,
  Phone,
  Calendar,
  UserCheck,
  Filter
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function MyVisits() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [visits, setVisits] = useState<VisitListDto[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<VisitStatus | null>(null)

  useEffect(() => {
    loadVisits()
  }, [user?.id])

  const loadVisits = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await visitService.getMyVisits(user.id)
      setVisits(data)
    } catch (error: any) {
      console.warn('Error loading visits:', error)
      if (error.response?.status !== 404) {
        toast.error('Error al cargar visitas')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await visitService.cancel(id)
      toast.success('Visita cancelada')
      loadVisits()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al cancelar visita')
    }
  }

  const filteredVisits = selectedStatus !== null
    ? visits.filter(v => v.status === selectedStatus)
    : visits

  const pendingCount = visits.filter(v => v.status === VisitStatus.Pending).length
  const approvedCount = visits.filter(v => v.status === VisitStatus.Approved).length
  const activeCount = visits.filter(v => v.status === VisitStatus.CheckedIn).length
  const completedCount = visits.filter(v => v.status === VisitStatus.CheckedOut).length

  const getStatusIcon = (status: VisitStatus) => {
    switch (status) {
      case VisitStatus.Pending: return <Clock className="w-5 h-5 text-yellow-500" />
      case VisitStatus.Approved: return <CheckCircle className="w-5 h-5 text-green-500" />
      case VisitStatus.Rejected: return <XCircle className="w-5 h-5 text-red-500" />
      case VisitStatus.CheckedIn: return <LogIn className="w-5 h-5 text-blue-500" />
      case VisitStatus.CheckedOut: return <LogOut className="w-5 h-5 text-gray-500" />
      case VisitStatus.Cancelled: return <XCircle className="w-5 h-5 text-gray-400" />
      case VisitStatus.Expired: return <Clock className="w-5 h-5 text-gray-400" />
      default: return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: VisitStatus) => {
    switch (status) {
      case VisitStatus.Pending: return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      case VisitStatus.Approved: return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
      case VisitStatus.Rejected: return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
      case VisitStatus.CheckedIn: return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case VisitStatus.CheckedOut: return 'bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
      case VisitStatus.Cancelled: return 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
      case VisitStatus.Expired: return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
      default: return 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
    }
  }

  const getTypeColor = (type: VisitType) => {
    switch (type) {
      case VisitType.Personal: return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
      case VisitType.Delivery: return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
      case VisitType.Service: return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
      case VisitType.Contractor: return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
      case VisitType.Medical: return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Mis Visitas</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Gestiona tus solicitudes de visitas</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-semibold">Pendientes</h3>
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-2xl sm:text-4xl font-black text-yellow-600 dark:text-yellow-400">{pendingCount}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-semibold">Aprobadas</h3>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl sm:text-4xl font-black text-green-600 dark:text-green-400">{approvedCount}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-semibold">En el Sitio</h3>
            <UserCheck className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">{activeCount}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-semibold">Finalizadas</h3>
            <LogOut className="h-5 w-5 text-gray-500" />
          </div>
          <p className="text-2xl sm:text-4xl font-black text-gray-600 dark:text-gray-400">{completedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 flex-wrap items-center">
        <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        {[
          { label: 'Todas', value: null },
          { label: 'Pendientes', value: VisitStatus.Pending },
          { label: 'Aprobadas', value: VisitStatus.Approved },
          { label: 'En el Sitio', value: VisitStatus.CheckedIn },
          { label: 'Finalizadas', value: VisitStatus.CheckedOut },
        ].map(f => (
          <button
            key={String(f.value)}
            onClick={() => setSelectedStatus(f.value)}
            className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              selectedStatus === f.value
                ? 'bg-sky-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* New Visit Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/resident/visits/new')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Plus className="w-5 h-5" />
          Registrar Nueva Visita
        </button>
      </div>

      {/* Visits List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando visitas...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">No hay visitas registradas</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Registra una nueva visita para comenzar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map(visit => (
            <div
              key={visit.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(visit.status)}
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{visit.visitorName}</h3>
                      {visit.visitorCount > 1 && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          (+{visit.visitorCount - 1} personas)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(visit.expectedArrival).toLocaleDateString('es-ES', { 
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(visit.status)}`}>
                      {visit.statusName}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(visit.type)}`}>
                      {visit.typeName}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {visit.visitorPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" /> {visit.visitorPhone}
                    </span>
                  )}
                  {visit.vehiclePlate && (
                    <span className="flex items-center gap-1">
                      <Car className="w-4 h-4" /> {visit.vehiclePlate}
                    </span>
                  )}
                  {visit.purpose && (
                    <span className="text-gray-500 dark:text-gray-400 italic">"{visit.purpose}"</span>
                  )}
                </div>

                {/* Check-in/out times */}
                {visit.checkInAt && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      Entrada: {new Date(visit.checkInAt).toLocaleString('es-ES')}
                    </span>
                    {visit.checkOutAt && (
                      <span className="ml-4 text-blue-600 dark:text-blue-400 font-medium">
                        Salida: {new Date(visit.checkOutAt).toLocaleString('es-ES')}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Creada: {new Date(visit.createdAt).toLocaleDateString('es-ES')}
                  </span>
                  <div className="flex gap-2">
                    {visit.status === VisitStatus.Pending && (
                      <button
                        onClick={() => navigate(`/resident/visits/${visit.id}/edit`)}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                      >
                        Editar
                      </button>
                    )}
                    {(visit.status === VisitStatus.Pending || visit.status === VisitStatus.Approved) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancel(visit.id) }}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/resident/visits/${visit.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
                    >
                      Ver detalles <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
