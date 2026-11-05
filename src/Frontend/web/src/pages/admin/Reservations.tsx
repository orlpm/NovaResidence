import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Search, 
  MoreVertical, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Users,
  X,
  Check,
  AlertTriangle
} from 'lucide-react'
import { 
  reservationService, 
  ReservationStatus,
  reservationStatusNames,
  type ReservationListDto,
  type ReservationDetailDto
} from '../../lib/reservationService'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { useAuthStore } from '../../stores/authStore'

export default function Reservations() {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const openedReservationId = useRef<string | null>(null)
  const [reservations, setReservations] = useState<ReservationListDto[]>([])
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<ReservationListDto | null>(null)
  const [reservationDetail, setReservationDetail] = useState<ReservationDetailDto | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => { loadCondominiums() }, [])

  useEffect(() => {
    if (selectedCondominium) loadReservations()
  }, [selectedCondominium, filterStatus])

  useEffect(() => {
    const linkedId = searchParams.get('id')
    if (!linkedId || isLoading || openedReservationId.current === linkedId) return
    openedReservationId.current = linkedId
    void loadReservationDetail(linkedId)
  }, [searchParams, isLoading])

  const loadCondominiums = async () => {
    try {
      const data = await condominiumService.getAllCondominiums(user?.id)
      setCondominiums(data)
      if (data.length > 0) setSelectedCondominium(data[0].id)
    } catch { setError('Error al cargar condominios') }
  }

  const loadReservations = async () => {
    if (!selectedCondominium) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await reservationService.getByCondominium(selectedCondominium)
      // Filter by status if selected
      const filtered = filterStatus !== null 
        ? data.filter(r => r.status === filterStatus)
        : data
      setReservations(filtered)
    } catch { setError('Error al cargar reservaciones') }
    finally { setIsLoading(false) }
  }

  const loadReservationDetail = async (id: string) => {
    try {
      const detail = await reservationService.getById(id)
      setReservationDetail(detail)
      setShowDetailModal(true)
    } catch { setError('Error al cargar detalle de reservación') }
  }

  const handleApprove = async () => {
    if (!selectedReservation || !user?.id) return
    try {
      await reservationService.approve(selectedReservation.id, { approvedByUserId: user.id })
      setShowApproveModal(false)
      setSelectedReservation(null)
      loadReservations()
      showSuccess('Reservación aprobada exitosamente')
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al aprobar reservación'
      setError(errorMessage)
    }
  }

  const handleReject = async () => {
    if (!selectedReservation || !user?.id || !rejectReason.trim()) return
    try {
      await reservationService.reject(selectedReservation.id, { 
        rejectedByUserId: user.id,
        reason: rejectReason 
      })
      setShowRejectModal(false)
      setSelectedReservation(null)
      setRejectReason('')
      loadReservations()
      showSuccess('Reservación rechazada')
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al rechazar reservación'
      setError(errorMessage)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const getStatusColor = (status: ReservationStatus) => {
    switch (status) {
      case ReservationStatus.Pending: return 'bg-yellow-100 text-yellow-800'
      case ReservationStatus.Confirmed: return 'bg-green-100 text-green-800'
      case ReservationStatus.InProgress: return 'bg-blue-100 text-blue-800'
      case ReservationStatus.Rejected: return 'bg-red-100 text-red-800'
      case ReservationStatus.Cancelled: return 'bg-gray-100 text-gray-800'
      case ReservationStatus.Completed: return 'bg-purple-100 text-purple-800'
      case ReservationStatus.NoShow: return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: ReservationStatus) => {
    switch (status) {
      case ReservationStatus.Pending: return <Clock className="w-4 h-4" />
      case ReservationStatus.Confirmed: return <CheckCircle className="w-4 h-4" />
      case ReservationStatus.Rejected: return <XCircle className="w-4 h-4" />
      case ReservationStatus.Cancelled: return <XCircle className="w-4 h-4" />
      case ReservationStatus.Completed: return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const filteredReservations = reservations.filter(r =>
    r.amenityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.residentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Statistics
  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === ReservationStatus.Pending).length,
    confirmed: reservations.filter(r => r.status === ReservationStatus.Confirmed).length,
    rejected: reservations.filter(r => r.status === ReservationStatus.Rejected).length
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Reservaciones</h1>
          <p className="text-gray-500 mt-1">Administra las reservaciones de amenidades</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={selectedCondominium}
          onChange={(e) => setSelectedCondominium(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecciona un condominio</option>
          {condominiums.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por amenidad, residente o unidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterStatus ?? ''}
          onChange={(e) => setFilterStatus(e.target.value ? Number(e.target.value) : null)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(reservationStatusNames).map(([value, name]) => (
            <option key={value} value={value}>{name}</option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aprobadas</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.confirmed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rechazadas</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando reservaciones...</div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {selectedCondominium ? 'No hay reservaciones' : 'Selecciona un condominio para ver reservaciones'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amenidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Residente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Horario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Invitados</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">{reservation.amenityName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {reservation.residentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {reservation.unitNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {reservation.reservationDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {reservation.startTime} - {reservation.endTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {reservation.numberOfGuests}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                      {getStatusIcon(reservation.status)}
                      {reservationStatusNames[reservation.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="relative inline-block text-left">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === reservation.id ? null : reservation.id)}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                      {openDropdown === reservation.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                          <button
                            onClick={() => { loadReservationDetail(reservation.id); setOpenDropdown(null) }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" /> Ver Detalles
                          </button>
                          {reservation.status === ReservationStatus.Pending && (
                            <>
                              <button
                                onClick={() => { setSelectedReservation(reservation); setShowApproveModal(true); setOpenDropdown(null) }}
                                className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 flex items-center gap-2"
                              >
                                <Check className="w-4 h-4" /> Aprobar
                              </button>
                              <button
                                onClick={() => { setSelectedReservation(reservation); setShowRejectModal(true); setOpenDropdown(null) }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                              >
                                <X className="w-4 h-4" /> Rechazar
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && reservationDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Detalle de Reservación</h3>
              <button onClick={() => { setShowDetailModal(false); setReservationDetail(null) }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Amenidad</p>
                  <p className="font-medium text-gray-900 dark:text-white">{reservationDetail.amenityName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Estado</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(reservationDetail.status)}`}>
                    {reservationStatusNames[reservationDetail.status]}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Residente</p>
                  <p className="font-medium text-gray-900 dark:text-white">{reservationDetail.residentName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Unidad</p>
                  <p className="font-medium text-gray-900 dark:text-white">{reservationDetail.unitNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fecha</p>
                  <p className="font-medium text-gray-900 dark:text-white">{reservationDetail.reservationDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Horario</p>
                  <p className="font-medium text-gray-900 dark:text-white">{reservationDetail.startTime} - {reservationDetail.endTime}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Número de Invitados</p>
                  <p className="font-medium text-gray-900 dark:text-white">{reservationDetail.numberOfGuests}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Creada</p>
                  <p className="font-medium text-gray-900 dark:text-white">{new Date(reservationDetail.createdAt).toLocaleString('es-MX')}</p>
                </div>
              </div>
              {reservationDetail.notes && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Notas</p>
                  <p className="mt-1 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{reservationDetail.notes}</p>
                </div>
              )}
              {reservationDetail.cancellationReason && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Motivo de Rechazo/Cancelación</p>
                  <p className="mt-1 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{reservationDetail.cancellationReason}</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              {reservationDetail.status === ReservationStatus.Pending && (
                <>
                  <button
                    onClick={() => { setSelectedReservation(reservationDetail); setShowDetailModal(false); setShowApproveModal(true) }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Aprobar
                  </button>
                  <button
                    onClick={() => { setSelectedReservation(reservationDetail); setShowDetailModal(false); setShowRejectModal(true) }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Rechazar
                  </button>
                </>
              )}
              <button
                onClick={() => { setShowDetailModal(false); setReservationDetail(null) }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Aprobar Reservación</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              ¿Estás seguro de aprobar la reservación de <strong>{selectedReservation.residentName}</strong> para <strong>{selectedReservation.amenityName}</strong> el día <strong>{selectedReservation.reservationDate}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowApproveModal(false); setSelectedReservation(null) }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rechazar Reservación</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Vas a rechazar la reservación de <strong>{selectedReservation.residentName}</strong> para <strong>{selectedReservation.amenityName}</strong>.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo del rechazo *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ingresa el motivo del rechazo..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500"
                rows={3}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowRejectModal(false); setSelectedReservation(null); setRejectReason('') }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {openDropdown && (
        <div className="fixed inset-0 z-0" onClick={() => setOpenDropdown(null)} />
      )}
    </div>
  )
}
