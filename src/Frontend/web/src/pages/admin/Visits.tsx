import { useState, useEffect } from 'react'
import {
  Search, Eye, Trash2, CheckCircle, XCircle,
  LogIn, LogOut, Users, Calendar, Car, X
} from 'lucide-react'
import {
  visitService,
  VisitType,
  VisitStatus,
  visitTypeNames,
  visitStatusNames,
  type VisitListDto,
  type VisitDetailDto
} from '../../lib/visitService'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { parkingService, type VehicleDto } from '../../lib/operationsService'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

export default function AdminVisits() {
  const { user } = useAuthStore()
  const [visits, setVisits] = useState<VisitListDto[]>([])
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<VisitType | null>(null)
  const [filterStatus, setFilterStatus] = useState<VisitStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedVisit, setSelectedVisit] = useState<VisitListDto | null>(null)
  const [visitDetail, setVisitDetail] = useState<VisitDetailDto | null>(null)
  const [rejectReason, setRejectReason] = useState('')



  useEffect(() => { loadCondominiums() }, [])

  useEffect(() => {
    if (selectedCondominium) loadVisits()
  }, [selectedCondominium, filterType, filterStatus])

  const loadCondominiums = async () => {
    try {
      const data = await condominiumService.getAllCondominiums(user?.id)
      setCondominiums(data)
      if (data.length > 0) setSelectedCondominium(data[0].id)
    } catch { setError('Error al cargar condominios') }
  }

  const loadVisits = async () => {
    if (!selectedCondominium) return
    setIsLoading(true)
    setError(null)
    try {
      const [data, vehicleList] = await Promise.all([
        visitService.getByCondominium(selectedCondominium, {
          type: filterType ?? undefined,
          status: filterStatus ?? undefined
        }),
        parkingService.getVehicles(selectedCondominium)
      ])
      setVisits(data)
      setVehicles(vehicleList)
    } catch { setError('Error al cargar visitas') }
    finally { setIsLoading(false) }
  }

  const loadVisitDetail = async (id: string) => {
    try {
      const detail = await visitService.getById(id)
      setVisitDetail(detail)
      setShowDetailModal(true)
    } catch { setError('Error al cargar detalle de visita') }
  }

  const handleApprove = async (id: string) => {
    if (!user?.id) return
    try {
      await visitService.approve(id, user.id)
      toast.success('Visita aprobada')
      loadVisits()
      if (visitDetail?.id === id) loadVisitDetail(id)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al aprobar')
    }
  }

  const handleReject = async () => {
    if (!user?.id || !selectedVisit) return
    try {
      await visitService.reject(selectedVisit.id, user.id, rejectReason || undefined)
      toast.success('Visita rechazada')
      setShowRejectModal(false)
      setRejectReason('')
      loadVisits()
      if (visitDetail?.id === selectedVisit.id) {
        setShowDetailModal(false)
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al rechazar')
    }
  }

  const handleCheckIn = async (id: string) => {
    if (!user?.id) return
    try {
      await visitService.checkIn(id, user.id)
      toast.success('Entrada registrada')
      loadVisits()
      if (visitDetail?.id === id) loadVisitDetail(id)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al registrar entrada')
    }
  }

  const handleCheckOut = async (id: string) => {
    if (!user?.id) return
    try {
      await visitService.checkOut(id, user.id)
      toast.success('Salida registrada')
      loadVisits()
      if (visitDetail?.id === id) loadVisitDetail(id)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al registrar salida')
    }
  }

  const handleDelete = async () => {
    if (!selectedVisit) return
    try {
      await visitService.delete(selectedVisit.id)
      toast.success('Visita eliminada')
      setShowDeleteModal(false)
      loadVisits()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al eliminar')
    }
  }

  const filteredVisits = visits.filter(v => 
    v.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.vehiclePlate && v.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.purpose && v.purpose.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusColor = (status: VisitStatus) => {
    switch (status) {
      case VisitStatus.Pending: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case VisitStatus.Approved: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case VisitStatus.Rejected: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case VisitStatus.CheckedIn: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case VisitStatus.CheckedOut: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case VisitStatus.Cancelled: return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
      case VisitStatus.Expired: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: VisitType) => {
    switch (type) {
      case VisitType.Personal: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case VisitType.Delivery: return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case VisitType.Service: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case VisitType.Contractor: return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
      case VisitType.Medical: return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Gestión de Visitas</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Administra y controla las visitas del condominio</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Condominium Selector */}
      {condominiums.length > 1 && (
        <div className="mb-6">
          <select
            value={selectedCondominium}
            onChange={e => setSelectedCondominium(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
          >
            {condominiums.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total', count: visits.length, color: 'text-gray-700 dark:text-gray-300' },
          { label: 'Pendientes', count: visits.filter(v => v.status === VisitStatus.Pending).length, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Aprobadas', count: visits.filter(v => v.status === VisitStatus.Approved).length, color: 'text-green-600 dark:text-green-400' },
          { label: 'En el Sitio', count: visits.filter(v => v.status === VisitStatus.CheckedIn).length, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Finalizadas', count: visits.filter(v => v.status === VisitStatus.CheckedOut).length, color: 'text-gray-500' },
          { label: 'Rechazadas', count: visits.filter(v => v.status === VisitStatus.Rejected).length, color: 'text-red-600 dark:text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, placa o motivo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <select
          value={filterStatus !== null ? filterStatus.toString() : ''}
          onChange={e => setFilterStatus(e.target.value ? Number(e.target.value) as VisitStatus : null)}
          className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(visitStatusNames).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterType !== null ? filterType.toString() : ''}
          onChange={e => setFilterType(e.target.value ? Number(e.target.value) as VisitType : null)}
          className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(visitTypeNames).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Visits Table / Cards */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando visitas...</p>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">No hay visitas registradas</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Visitante</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Llegada</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Vehículo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredVisits.map(visit => (
                  <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 dark:text-white">{visit.visitorName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {visit.visitorCount > 1 && `${visit.visitorCount} personas · `}
                        {visit.visitorPhone && visit.visitorPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeColor(visit.type)}`}>
                        {visit.typeName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(visit.status)}`}>
                        {visit.statusName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(visit.expectedArrival).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {visit.vehiclePlate || '—'}
                      {(() => {
                        const owner = vehicles.find(item => item.plate.trim().toUpperCase() === (visit.vehiclePlate || '').trim().toUpperCase())
                        return owner?.residentName ? <span className="block text-xs text-gray-500">{owner.residentName}</span> : null
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => loadVisitDetail(visit.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {visit.status === VisitStatus.Pending && (
                          <button
                            onClick={() => handleApprove(visit.id)}
                            className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
                            title="Aprobar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {visit.status === VisitStatus.Pending && (
                          <button
                            onClick={() => { setSelectedVisit(visit); setShowRejectModal(true) }}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                            title="Rechazar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {(visit.status === VisitStatus.Approved || visit.status === VisitStatus.Pending) && (
                          <button
                            onClick={() => handleCheckIn(visit.id)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            title="Registrar entrada"
                          >
                            <LogIn className="w-4 h-4" />
                          </button>
                        )}
                        {visit.status === VisitStatus.CheckedIn && (
                          <button
                            onClick={() => handleCheckOut(visit.id)}
                            className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                            title="Registrar salida"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => { setSelectedVisit(visit); setShowDeleteModal(true) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredVisits.map(visit => (
              <div key={visit.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{visit.visitorName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {visit.visitorCount > 1 && `${visit.visitorCount} personas`}
                      {visit.visitorPhone && ` · ${visit.visitorPhone}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(visit.status)}`}>
                      {visit.statusName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(visit.type)}`}>
                      {visit.typeName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(visit.expectedArrival).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  {visit.vehiclePlate && <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {visit.vehiclePlate}</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => loadVisitDetail(visit.id)} className="px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-400 rounded-lg">Ver</button>
                  {visit.status === VisitStatus.Pending && (
                    <>
                      <button onClick={() => handleApprove(visit.id)} className="px-3 py-1.5 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg">Aprobar</button>
                      <button onClick={() => { setSelectedVisit(visit); setShowRejectModal(true) }} className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">Rechazar</button>
                    </>
                  )}
                  {(visit.status === VisitStatus.Approved || visit.status === VisitStatus.Pending) && (
                    <button onClick={() => handleCheckIn(visit.id)} className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg">Entrada</button>
                  )}
                  {visit.status === VisitStatus.CheckedIn && (
                    <button onClick={() => handleCheckOut(visit.id)} className="px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg">Salida</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && visitDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detalle de Visita</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${getStatusColor(visitDetail.status)}`}>
                  {visitDetail.statusName}
                </span>
                <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${getTypeColor(visitDetail.type)}`}>
                  {visitDetail.typeName}
                </span>
              </div>

              {/* Visitor Info */}
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Visitante</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500 dark:text-gray-400">Nombre:</span> <span className="font-semibold text-gray-900 dark:text-white">{visitDetail.visitorName}</span></div>
                  {visitDetail.visitorPhone && <div><span className="text-gray-500 dark:text-gray-400">Teléfono:</span> <span className="font-semibold text-gray-900 dark:text-white">{visitDetail.visitorPhone}</span></div>}
                  {visitDetail.visitorEmail && <div><span className="text-gray-500 dark:text-gray-400">Email:</span> <span className="font-semibold text-gray-900 dark:text-white">{visitDetail.visitorEmail}</span></div>}
                  {visitDetail.visitorIdentification && <div><span className="text-gray-500 dark:text-gray-400">ID:</span> <span className="font-semibold text-gray-900 dark:text-white">{visitDetail.visitorIdentification}</span></div>}
                  <div><span className="text-gray-500 dark:text-gray-400">Personas:</span> <span className="font-semibold text-gray-900 dark:text-white">{visitDetail.visitorCount}</span></div>
                </div>
              </div>

              {/* Vehicle */}
              {(visitDetail.vehiclePlate || visitDetail.vehicleDescription) && (
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Vehículo</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {visitDetail.vehiclePlate && <div><span className="text-gray-500 dark:text-gray-400">Placa:</span> <span className="font-bold text-gray-900 dark:text-white text-lg">{visitDetail.vehiclePlate}</span></div>}
                    {visitDetail.vehicleDescription && <div><span className="text-gray-500 dark:text-gray-400">Descripción:</span> <span className="font-semibold text-gray-900 dark:text-white">{visitDetail.vehicleDescription}</span></div>}
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Horario</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500 dark:text-gray-400">Llegada esperada:</span> <p className="font-semibold text-gray-900 dark:text-white">{new Date(visitDetail.expectedArrival).toLocaleString('es-ES')}</p></div>
                  {visitDetail.expectedDeparture && <div><span className="text-gray-500 dark:text-gray-400">Salida esperada:</span> <p className="font-semibold text-gray-900 dark:text-white">{new Date(visitDetail.expectedDeparture).toLocaleString('es-ES')}</p></div>}
                  {visitDetail.checkInAt && <div><span className="text-green-600 dark:text-green-400">Entrada real:</span> <p className="font-semibold text-green-700 dark:text-green-300">{new Date(visitDetail.checkInAt).toLocaleString('es-ES')}</p></div>}
                  {visitDetail.checkOutAt && <div><span className="text-blue-600 dark:text-blue-400">Salida real:</span> <p className="font-semibold text-blue-700 dark:text-blue-300">{new Date(visitDetail.checkOutAt).toLocaleString('es-ES')}</p></div>}
                </div>
              </div>

              {/* Purpose & Notes */}
              {(visitDetail.purpose || visitDetail.notes) && (
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Detalles</h3>
                  {visitDetail.purpose && <p className="text-sm text-gray-700 dark:text-gray-300 mb-1"><strong>Motivo:</strong> {visitDetail.purpose}</p>}
                  {visitDetail.notes && <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Notas:</strong> {visitDetail.notes}</p>}
                </div>
              )}

              {/* Rejection */}
              {visitDetail.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                  <p className="text-sm text-red-700 dark:text-red-300"><strong>Motivo del rechazo:</strong> {visitDetail.rejectionReason}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 flex-wrap pt-2 border-t border-gray-200 dark:border-gray-700">
                {visitDetail.status === VisitStatus.Pending && (
                  <>
                    <button onClick={() => handleApprove(visitDetail.id)} className="px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Aprobar
                    </button>
                    <button onClick={() => { setSelectedVisit({ ...visitDetail } as any); setShowRejectModal(true); setShowDetailModal(false) }} className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center gap-2">
                      <XCircle className="w-4 h-4" /> Rechazar
                    </button>
                  </>
                )}
                {(visitDetail.status === VisitStatus.Approved || visitDetail.status === VisitStatus.Pending) && (
                  <button onClick={() => handleCheckIn(visitDetail.id)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Registrar Entrada
                  </button>
                )}
                {visitDetail.status === VisitStatus.CheckedIn && (
                  <button onClick={() => handleCheckOut(visitDetail.id)} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Registrar Salida
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Rechazar Visita</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                ¿Estás seguro de rechazar la visita de <strong>{selectedVisit.visitorName}</strong>?
              </p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Motivo del rechazo (opcional)"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowRejectModal(false); setRejectReason('') }} className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold">Cancelar</button>
                <button onClick={handleReject} className="flex-1 py-2 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">Rechazar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Eliminar Visita</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                ¿Estás seguro de eliminar la visita de <strong>{selectedVisit.visitorName}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold">Cancelar</button>
                <button onClick={handleDelete} className="flex-1 py-2 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
