import { useState, useEffect } from 'react'
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Mail, 
  Phone, 
  Trash2, 
  Send,
  Building2,
  Home,
  Check,
  X,
  Copy
} from 'lucide-react'
import { residentService, type ResidentWithUnitDto } from '../../lib/residentService'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { useAuthStore } from '../../stores/authStore'

type ResidentType = 'Owner' | 'Tenant' | 'FamilyMember' | 'Authorized'

const RESIDENT_TYPE_LABELS: Record<ResidentType, string> = {
  Owner: 'Propietario',
  Tenant: 'Inquilino',
  FamilyMember: 'Familiar',
  Authorized: 'Autorizado'
}

const RESIDENT_TYPE_COLORS: Record<ResidentType, string> = {
  Owner: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
  Tenant: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
  FamilyMember: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300',
  Authorized: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300'
}

export default function Residents() {
  const { user } = useAuthStore()
  const [residents, setResidents] = useState<ResidentWithUnitDto[]>([])
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<ResidentType | ''>('')
  const [filterRegistered, setFilterRegistered] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [invitationUrl, setInvitationUrl] = useState<string>('')
  const [selectedResident, setSelectedResident] = useState<ResidentWithUnitDto | null>(null)

  // Load condominiums on mount
  useEffect(() => {
    loadCondominiums()
  }, [])

  // Load residents when condominium changes
  useEffect(() => {
    if (selectedCondominium) {
      loadResidents()
    }
  }, [selectedCondominium])

  const loadCondominiums = async () => {
    try {
      const data = await condominiumService.getAllCondominiums(user?.id)
      setCondominiums(data)
      if (data.length > 0) {
        setSelectedCondominium(data[0].id)
      }
    } catch (err) {
      console.error('Error loading condominiums:', err)
      setError('Error al cargar condominios')
    }
  }

  const loadResidents = async () => {
    if (!selectedCondominium) return
    
    setIsLoading(true)
    setError(null)
    try {
      const data = await residentService.getResidentsByCondominium(selectedCondominium)
      setResidents(data)
    } catch (err) {
      setError('Error al cargar residentes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendInvitation = async (resident: ResidentWithUnitDto) => {
    try {
      const result = await residentService.sendInvitation(resident.id)
      setInvitationUrl(result.invitationUrl)
      setSelectedResident(resident)
      setShowInvitationModal(true)
    } catch (err) {
      setError('Error al generar invitación')
    }
  }

  const handleDeleteResident = async (resident: ResidentWithUnitDto) => {
    if (!confirm(`¿Estás seguro de eliminar a ${resident.firstName} ${resident.lastName}?`)) return
    
    try {
      await residentService.deleteResident(resident.id)
      loadResidents()
    } catch (err) {
      setError('Error al eliminar residente')
    }
  }

  const copyInvitationUrl = () => {
    navigator.clipboard.writeText(invitationUrl)
    alert('Enlace copiado al portapapeles')
  }

  // Filter residents
  const filteredResidents = residents.filter(resident => {
    const fullName = `${resident.firstName} ${resident.lastName}`.toLowerCase()
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         resident.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resident.unitNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !filterType || resident.type === filterType
    const matchesRegistered = filterRegistered === null || resident.isRegistered === filterRegistered
    return matchesSearch && matchesType && matchesRegistered
  })

  // Group by building
  const groupedByBuilding = filteredResidents.reduce((acc, resident) => {
    const building = resident.buildingName || 'Sin edificio'
    if (!acc[building]) {
      acc[building] = []
    }
    acc[building].push(resident)
    return acc
  }, {} as Record<string, ResidentWithUnitDto[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Residentes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona los residentes de tus condominios
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!selectedCondominium}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus className="w-5 h-5" />
          Nuevo Residente
        </button>
      </div>

      {/* Condominium Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Seleccionar Condominio
        </label>
        <select
          value={selectedCondominium}
          onChange={(e) => setSelectedCondominium(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        >
          <option value="">Selecciona un condominio</option>
          {condominiums.map(condo => (
            <option key={condo.id} value={condo.id}>{condo.name}</option>
          ))}
        </select>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o unidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ResidentType | '')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(RESIDENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          {/* Registration Filter */}
          <select
            value={filterRegistered === null ? '' : filterRegistered.toString()}
            onChange={(e) => setFilterRegistered(e.target.value === '' ? null : e.target.value === 'true')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="true">Registrados</option>
            <option value="false">Pendientes</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && selectedCondominium && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{residents.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Residentes</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600">{residents.filter(r => r.type === 'Owner').length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Propietarios</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600">{residents.filter(r => r.isRegistered).length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Registrados</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-orange-600">{residents.filter(r => !r.isRegistered).length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Pendientes</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
        </div>
      ) : !selectedCondominium ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Selecciona un condominio para ver sus residentes
          </p>
        </div>
      ) : filteredResidents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || filterType || filterRegistered !== null 
              ? 'No se encontraron residentes con los filtros aplicados'
              : 'No hay residentes registrados. ¡Agrega el primero!'}
          </p>
          {!searchTerm && !filterType && filterRegistered === null && (
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              + Agregar primer residente
            </button>
          )}
        </div>
      ) : (
        /* Residents List by Building */
        <div className="space-y-6">
          {Object.entries(groupedByBuilding).map(([buildingName, buildingResidents]) => (
            <div key={buildingName} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Building Header */}
              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">{buildingName}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">({buildingResidents.length} residentes)</span>
                </div>
              </div>
              
              {/* Residents Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Residente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Unidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {buildingResidents.map(resident => (
                      <tr key={resident.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                              {resident.firstName[0]}{resident.lastName[0]}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {resident.firstName} {resident.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Home className="w-4 h-4" />
                            {resident.unitNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${RESIDENT_TYPE_COLORS[resident.type]}`}>
                            {RESIDENT_TYPE_LABELS[resident.type]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {resident.isRegistered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">
                              <Check className="w-3 h-3" />
                              Registrado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300">
                              <X className="w-3 h-3" />
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Mail className="w-3 h-3" />
                              {resident.email}
                            </div>
                            {resident.phoneNumber && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="w-3 h-3" />
                                {resident.phoneNumber}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!resident.isRegistered && (
                              <button
                                onClick={() => handleSendInvitation(resident)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Enviar invitación"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteResident(resident)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
            </div>
          ))}
        </div>
      )}

      {/* Invitation Modal */}
      {showInvitationModal && selectedResident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Invitación Generada
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Comparte este enlace con <strong>{selectedResident.firstName} {selectedResident.lastName}</strong> para que complete su registro.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={invitationUrl}
                  className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none"
                />
                <button
                  onClick={copyInvitationUrl}
                  className="p-2 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Este enlace expira en 7 días.
            </p>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowInvitationModal(false)
                  setInvitationUrl('')
                  setSelectedResident(null)
                }}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Resident Modal */}
      {showAddModal && (
        <AddResidentModal
          condominiumId={selectedCondominium}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            loadResidents()
          }}
        />
      )}
    </div>
  )
}

// Add Resident Modal Component
interface AddResidentModalProps {
  condominiumId: string
  onClose: () => void
  onSuccess: () => void
}

function AddResidentModal({ condominiumId, onClose, onSuccess }: AddResidentModalProps) {
  const [units, setUnits] = useState<Array<{ id: string; unitNumber: string; buildingName: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  type ResidentType = 'Owner' | 'Tenant' | 'FamilyMember' | 'Authorized'
  
  const [formData, setFormData] = useState({
    unitId: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    type: 'Owner' as ResidentType
  })

  useEffect(() => {
    loadUnits()
  }, [])

  const loadUnits = async () => {
    try {
      const condoDetails = await condominiumService.getCondominiumById(condominiumId)
      const allUnits: Array<{ id: string; unitNumber: string; buildingName: string }> = []
      
      condoDetails.buildings?.forEach((building: { name: string; units?: Array<{ id: string; unitNumber: string }> }) => {
        building.units?.forEach((unit: { id: string; unitNumber: string }) => {
          allUnits.push({
            id: unit.id,
            unitNumber: unit.unitNumber,
            buildingName: building.name
          })
        })
      })
      
      setUnits(allUnits)
    } catch (err) {
      setError('Error al cargar unidades')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.unitId) {
      setError('Selecciona una unidad')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      await residentService.createResident({
        unitId: formData.unitId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber || undefined,
        type: formData.type
      })
      onSuccess()
    } catch (err) {
      setError('Error al crear residente')
    } finally {
      setIsSubmitting(false)
    }
  }

  const TYPE_LABELS: Record<ResidentType, string> = {
    Owner: 'Propietario',
    Tenant: 'Inquilino',
    FamilyMember: 'Familiar',
    Authorized: 'Autorizado'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Nuevo Residente
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unidad *
            </label>
            {isLoading ? (
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            ) : (
              <select
                required
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="">Selecciona una unidad</option>
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.buildingName} - {unit.unitNumber}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ResidentType })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Crear Residente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
