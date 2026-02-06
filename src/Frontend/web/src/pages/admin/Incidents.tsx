import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  MessageSquare,
  X,
  Play,
  RefreshCw
} from 'lucide-react'
import { 
  incidentService, 
  IncidentType,
  IncidentPriority,
  IncidentStatus,
  incidentTypeNames,
  incidentPriorityNames,
  incidentStatusNames,
  type IncidentListDto,
  type IncidentDetailDto,
  type CreateIncidentRequest
} from '../../lib/incidentService'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { useAuthStore } from '../../stores/authStore'

export default function Incidents() {
  const { user } = useAuthStore()
  const [incidents, setIncidents] = useState<IncidentListDto[]>([])
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<IncidentType | null>(null)
  const [filterPriority, setFilterPriority] = useState<IncidentPriority | null>(null)
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<IncidentListDto | null>(null)
  const [incidentDetail, setIncidentDetail] = useState<IncidentDetailDto | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateIncidentRequest>({
    condominiumId: '',
    reportedById: '',
    title: '',
    description: '',
    type: IncidentType.Maintenance,
    priority: IncidentPriority.Medium,
    location: ''
  })

  const [resolveData, setResolveData] = useState({
    resolvedById: '',
    resolutionNotes: '',
    actualCost: ''
  })

  const [reopenReason, setReopenReason] = useState('')

  useEffect(() => { loadCondominiums() }, [])

  useEffect(() => {
    if (selectedCondominium) loadIncidents()
  }, [selectedCondominium, filterType, filterPriority, filterStatus])

  const loadCondominiums = async () => {
    try {
      const data = await condominiumService.getAllCondominiums(user?.id)
      setCondominiums(data)
      if (data.length > 0) setSelectedCondominium(data[0].id)
    } catch { setError('Error al cargar condominios') }
  }

  const loadIncidents = async () => {
    if (!selectedCondominium) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await incidentService.getByCondominium(selectedCondominium, {
        type: filterType ?? undefined,
        priority: filterPriority ?? undefined,
        status: filterStatus ?? undefined
      })
      setIncidents(data)
    } catch { setError('Error al cargar incidencias') }
    finally { setIsLoading(false) }
  }

  const loadIncidentDetail = async (id: string) => {
    try {
      const detail = await incidentService.getById(id)
      setIncidentDetail(detail)
      setShowDetailModal(true)
    } catch { setError('Error al cargar detalle de incidencia') }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!selectedCondominium) {
      setError('Debes seleccionar un condominio antes de crear una incidencia')
      return
    }
    if (!user?.id) {
      setError('Error de autenticación. Por favor, inicia sesión de nuevo.')
      return
    }
    
    try {
      await incidentService.create({
        ...formData,
        condominiumId: selectedCondominium,
        reportedById: user.id
      })
      setShowCreateModal(false)
      resetForm()
      loadIncidents()
      showSuccess('Incidencia creada exitosamente')
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0] || 'Error al crear incidencia'
      setError(errorMessage)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIncident) return
    try {
      await incidentService.update(selectedIncident.id, {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        location: formData.location
      })
      setShowEditModal(false)
      resetForm()
      loadIncidents()
      showSuccess('Incidencia actualizada exitosamente')
    } catch { setError('Error al actualizar incidencia') }
  }

  const handleDelete = async () => {
    if (!selectedIncident) return
    try {
      await incidentService.delete(selectedIncident.id)
      setShowDeleteModal(false)
      setSelectedIncident(null)
      loadIncidents()
      showSuccess('Incidencia eliminada exitosamente')
    } catch { setError('Error al eliminar incidencia') }
  }

  const handleAcknowledge = async (incident: IncidentListDto) => {
    try {
      await incidentService.acknowledge(incident.id)
      loadIncidents()
      showSuccess('Incidencia recibida')
    } catch { setError('Error al recibir incidencia') }
    setOpenDropdown(null)
  }

  const handleStartProgress = async (incident: IncidentListDto) => {
    try {
      await incidentService.startProgress(incident.id)
      loadIncidents()
      showSuccess('Incidencia en progreso')
    } catch { setError('Error al iniciar progreso') }
    setOpenDropdown(null)
  }

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIncident) return
    try {
      await incidentService.resolve(selectedIncident.id, {
        resolvedById: user?.id || '',
        resolutionNotes: resolveData.resolutionNotes,
        actualCost: resolveData.actualCost ? parseFloat(resolveData.actualCost) : undefined
      })
      setShowResolveModal(false)
      setResolveData({ resolvedById: '', resolutionNotes: '', actualCost: '' })
      loadIncidents()
      showSuccess('Incidencia resuelta')
    } catch { setError('Error al resolver incidencia') }
  }

  const handleClose = async (incident: IncidentListDto) => {
    try {
      await incidentService.close(incident.id)
      loadIncidents()
      showSuccess('Incidencia cerrada')
    } catch { setError('Error al cerrar incidencia') }
    setOpenDropdown(null)
  }

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIncident) return
    try {
      await incidentService.reopen(selectedIncident.id, { reason: reopenReason })
      setShowReopenModal(false)
      setReopenReason('')
      loadIncidents()
      showSuccess('Incidencia reabierta')
    } catch { setError('Error al reabrir incidencia') }
  }

  const resetForm = () => {
    setFormData({
      condominiumId: '',
      reportedById: '',
      title: '',
      description: '',
      type: IncidentType.Maintenance,
      priority: IncidentPriority.Medium,
      location: ''
    })
  }

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const openEditModal = (incident: IncidentListDto) => {
    setSelectedIncident(incident)
    setFormData({
      condominiumId: selectedCondominium,
      reportedById: user?.id || '',
      title: incident.title,
      description: '',
      type: incident.type,
      priority: incident.priority,
      location: ''
    })
    setShowEditModal(true)
    setOpenDropdown(null)
  }

  const openResolveModal = (incident: IncidentListDto) => {
    setSelectedIncident(incident)
    setShowResolveModal(true)
    setOpenDropdown(null)
  }

  const openReopenModal = (incident: IncidentListDto) => {
    setSelectedIncident(incident)
    setShowReopenModal(true)
    setOpenDropdown(null)
  }

  const getPriorityColor = (priority: IncidentPriority) => {
    switch (priority) {
      case IncidentPriority.Low: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case IncidentPriority.Medium: return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case IncidentPriority.High: return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      case IncidentPriority.Urgent: return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusColor = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.Open: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      case IncidentStatus.Acknowledged: return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case IncidentStatus.InProgress: return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      case IncidentStatus.Resolved: return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case IncidentStatus.Closed: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case IncidentStatus.Reopened: return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredIncidents = incidents.filter(incident =>
    incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.reportedByName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Incidencias</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona las incidencias reportadas en el condominio</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} disabled={!selectedCondominium} className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <Plus className="w-5 h-5" /> Nueva Incidencia
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-5 h-5 text-red-500" /></button>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-green-700 dark:text-green-300">{successMessage}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seleccionar Condominio</label>
        <select value={selectedCondominium} onChange={(e) => setSelectedCondominium(e.target.value)} className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent">
          <option value="">Selecciona un condominio</option>
          {condominiums.map(condo => (<option key={condo.id} value={condo.id}>{condo.name}</option>))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Buscar incidencias..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
          </div>
          <select value={filterType ?? ''} onChange={(e) => setFilterType(e.target.value ? Number(e.target.value) as IncidentType : null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent">
            <option value="">Todos los tipos</option>
            {Object.entries(incidentTypeNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
          </select>
          <select value={filterPriority ?? ''} onChange={(e) => setFilterPriority(e.target.value ? Number(e.target.value) as IncidentPriority : null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent">
            <option value="">Todas las prioridades</option>
            {Object.entries(incidentPriorityNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
          </select>
          <select value={filterStatus ?? ''} onChange={(e) => setFilterStatus(e.target.value ? Number(e.target.value) as IncidentStatus : null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent">
            <option value="">Todos los estados</option>
            {Object.entries(incidentStatusNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Cargando incidencias...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No hay incidencias registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prioridad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reportado por</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredIncidents.map((incident, index) => {
                  const isLastRows = index >= filteredIncidents.length - 2
                  return (
                  <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{incident.title}</div>
                      {incident.unitNumber && <div className="text-xs text-gray-500 dark:text-gray-400">Unidad: {incident.unitNumber}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-gray-600 dark:text-gray-300">{incident.typeName}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(incident.priority)}`}>{incident.priorityName}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(incident.status)}`}>{incident.statusName}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600 dark:text-gray-300">{incident.reportedByName}</span></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-600 dark:text-gray-300">{new Date(incident.createdAt).toLocaleDateString()}</span></div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative">
                        <button onClick={() => setOpenDropdown(openDropdown === incident.id ? null : incident.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><MoreVertical className="w-5 h-5 text-gray-400" /></button>
                        {openDropdown === incident.id && (
                          <div className={`absolute right-0 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 ${isLastRows ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                            <button onClick={() => { loadIncidentDetail(incident.id); setOpenDropdown(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Eye className="w-4 h-4" /> Ver Detalle</button>
                            {incident.status === IncidentStatus.Open && <button onClick={() => handleAcknowledge(incident)} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Recibir</button>}
                            {incident.status === IncidentStatus.Acknowledged && <button onClick={() => handleStartProgress(incident)} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Play className="w-4 h-4" /> Iniciar Progreso</button>}
                            {incident.status === IncidentStatus.InProgress && <button onClick={() => openResolveModal(incident)} className="w-full px-4 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Resolver</button>}
                            {incident.status === IncidentStatus.Resolved && <button onClick={() => handleClose(incident)} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Cerrar</button>}
                            {(incident.status === IncidentStatus.Closed || incident.status === IncidentStatus.Resolved) && <button onClick={() => openReopenModal(incident)} className="w-full px-4 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Reabrir</button>}
                            {incident.status === IncidentStatus.Open && (
                              <>
                                <button onClick={() => openEditModal(incident)} className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Edit2 className="w-4 h-4" /> Editar</button>
                                <button onClick={() => { setSelectedIncident(incident); setShowDeleteModal(true); setOpenDropdown(null); }} className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Eliminar</button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Incidencia</h2>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción *</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={4} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: Number(e.target.value) as IncidentType })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                    {Object.entries(incidentTypeNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad *</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as IncidentPriority })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                    {Object.entries(incidentPriorityNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
                <input type="text" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Ej: Área de alberca, Estacionamiento nivel 2" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all">Crear Incidencia</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Editar Incidencia</h2>
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción *</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required rows={4} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: Number(e.target.value) as IncidentType })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                    {Object.entries(incidentTypeNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad *</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) as IncidentPriority })} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent">
                    {Object.entries(incidentPriorityNames).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
                <input type="text" value={formData.location || ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); resetForm(); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-500" /></div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">Eliminar Incidencia</h2>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">¿Estás seguro de que deseas eliminar la incidencia "{selectedIncident.title}"? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteModal(false); setSelectedIncident(null); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResolveModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Resolver Incidencia</h2>
              <button onClick={() => setShowResolveModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleResolve} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas de Resolución *</label>
                <textarea value={resolveData.resolutionNotes} onChange={(e) => setResolveData({ ...resolveData, resolutionNotes: e.target.value })} required rows={4} placeholder="Describe cómo se resolvió la incidencia..." className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo Real</label>
                <input type="number" step="0.01" value={resolveData.actualCost} onChange={(e) => setResolveData({ ...resolveData, actualCost: e.target.value })} placeholder="0.00" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowResolveModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all">Resolver</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReopenModal && selectedIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reabrir Incidencia</h2>
              <button onClick={() => setShowReopenModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleReopen} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razón para Reabrir *</label>
                <textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} required rows={4} placeholder="Describe por qué se necesita reabrir esta incidencia..." className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowReopenModal(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all">Reabrir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && incidentDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detalle de Incidencia</h2>
              <button onClick={() => { setShowDetailModal(false); setIncidentDetail(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{incidentDetail.title}</h3>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(incidentDetail.priority)}`}>{incidentDetail.priorityName}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(incidentDetail.status)}`}>{incidentDetail.statusName}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500 dark:text-gray-400">Tipo</p><p className="text-gray-900 dark:text-white">{incidentDetail.typeName}</p></div>
                <div><p className="text-sm text-gray-500 dark:text-gray-400">Reportado por</p><p className="text-gray-900 dark:text-white">{incidentDetail.reportedByName}</p></div>
                {incidentDetail.unitNumber && <div><p className="text-sm text-gray-500 dark:text-gray-400">Unidad</p><p className="text-gray-900 dark:text-white">{incidentDetail.unitNumber}</p></div>}
                {incidentDetail.location && <div><p className="text-sm text-gray-500 dark:text-gray-400">Ubicación</p><p className="text-gray-900 dark:text-white">{incidentDetail.location}</p></div>}
                {incidentDetail.assignedToName && <div><p className="text-sm text-gray-500 dark:text-gray-400">Asignado a</p><p className="text-gray-900 dark:text-white">{incidentDetail.assignedToName}</p></div>}
                <div><p className="text-sm text-gray-500 dark:text-gray-400">Fecha de creación</p><p className="text-gray-900 dark:text-white">{new Date(incidentDetail.createdAt).toLocaleString()}</p></div>
              </div>
              <div><p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Descripción</p><p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">{incidentDetail.description}</p></div>
              {incidentDetail.resolutionNotes && <div><p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Notas de Resolución</p><p className="text-gray-900 dark:text-white bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">{incidentDetail.resolutionNotes}</p></div>}
              {incidentDetail.comments.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Comentarios ({incidentDetail.comments.length})</p>
                  <div className="space-y-3">
                    {incidentDetail.comments.map((comment) => (
                      <div key={comment.id} className={`p-3 rounded-lg ${comment.isInternal ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">{comment.userName}</span>
                          <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{comment.content}</p>
                        {comment.isInternal && <span className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 inline-block">Interno</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
