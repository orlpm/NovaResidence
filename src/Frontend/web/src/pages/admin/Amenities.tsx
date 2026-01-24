import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Clock,
  Users,
  DollarSign,
  X
} from 'lucide-react'
import { 
  amenityService, 
  type AmenityListDto, 
  type AmenityType,
  type CreateAmenityRequest,
  type UpdateAmenityRequest,
  getAmenityTypeConfig 
} from '../../lib/amenityService'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { useAuthStore } from '../../stores/authStore'

export default function Amenities() {
  const { user } = useAuthStore()
  const [amenities, setAmenities] = useState<AmenityListDto[]>([])
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [amenityTypes, setAmenityTypes] = useState<AmenityType[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<number | null>(null)
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityListDto | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    loadCondominiums()
    loadAmenityTypes()
  }, [])

  // Load amenities when condominium changes
  useEffect(() => {
    if (selectedCondominium) {
      loadAmenities()
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

  const loadAmenityTypes = async () => {
    try {
      const types = await amenityService.getTypes()
      setAmenityTypes(types)
    } catch (err) {
      console.error('Error loading amenity types:', err)
    }
  }

  const loadAmenities = async () => {
    if (!selectedCondominium) return
    
    setIsLoading(true)
    setError(null)
    try {
      const data = await amenityService.getByCondominium(selectedCondominium)
      setAmenities(data)
    } catch (err) {
      setError('Error al cargar amenidades')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (amenity: AmenityListDto) => {
    try {
      await amenityService.toggleStatus(amenity.id, !amenity.isActive)
      loadAmenities()
    } catch (err) {
      setError('Error al cambiar estado')
    }
    setOpenDropdown(null)
  }

  const handleDelete = async () => {
    if (!selectedAmenity) return
    
    try {
      await amenityService.delete(selectedAmenity.id)
      setShowDeleteModal(false)
      setSelectedAmenity(null)
      loadAmenities()
    } catch (err) {
      setError('Error al eliminar amenidad')
    }
  }

  // Filter amenities
  const filteredAmenities = amenities.filter(amenity => {
    const matchesSearch = amenity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         amenity.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === null || amenity.typeId === filterType
    const matchesActive = filterActive === null || amenity.isActive === filterActive
    return matchesSearch && matchesType && matchesActive
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Amenidades</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona las amenidades de tus condominios
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!selectedCondominium}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Nueva Amenidad
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
              placeholder="Buscar amenidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType ?? ''}
              onChange={(e) => setFilterType(e.target.value ? Number(e.target.value) : null)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            >
              <option value="">Todos los tipos</option>
              {amenityTypes.map(type => (
                <option key={type.id} value={type.id}>{type.displayName}</option>
              ))}
            </select>
          </div>
          
          {/* Active Filter */}
          <select
            value={filterActive === null ? '' : filterActive.toString()}
            onChange={(e) => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>
      </div>

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
          <p className="text-gray-500 dark:text-gray-400">
            Selecciona un condominio para ver sus amenidades
          </p>
        </div>
      ) : filteredAmenities.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || filterType || filterActive !== null 
              ? 'No se encontraron amenidades con los filtros aplicados'
              : 'No hay amenidades registradas. ¡Crea la primera!'}
          </p>
        </div>
      ) : (
        /* Amenities Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAmenities.map(amenity => {
            const config = getAmenityTypeConfig(amenity.typeId)
            return (
              <div 
                key={amenity.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className={`p-4 ${config.bgColor} dark:bg-opacity-20 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{amenity.name}</h3>
                      <p className={`text-sm ${config.color}`}>{amenity.type}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === amenity.id ? null : amenity.id)}
                      className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {openDropdown === amenity.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                        <button
                          onClick={() => {
                            setSelectedAmenity(amenity)
                            setShowEditModal(true)
                            setOpenDropdown(null)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleStatus(amenity)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          {amenity.isActive ? (
                            <>
                              <ToggleLeft className="w-4 h-4" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <ToggleRight className="w-4 h-4" />
                              Activar
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAmenity(amenity)
                            setShowDeleteModal(true)
                            setOpenDropdown(null)
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {amenity.description || 'Sin descripción'}
                  </p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>Capacidad: {amenity.capacity}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{amenity.openingTime} - {amenity.closingTime}</span>
                    </div>
                    {amenity.reservationFee && (
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <DollarSign className="w-4 h-4" />
                        <span>${amenity.reservationFee}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      amenity.isActive 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {amenity.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                    {amenity.requiresReservation && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Requiere reservación
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <AmenityFormModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            setSelectedAmenity(null)
          }}
          onSuccess={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            setSelectedAmenity(null)
            loadAmenities()
          }}
          condominiumId={selectedCondominium}
          amenity={selectedAmenity}
          amenityTypes={amenityTypes}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAmenity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar Amenidad
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              ¿Estás seguro de que deseas eliminar la amenidad <strong>{selectedAmenity.name}</strong>? 
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedAmenity(null)
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Form Modal Component
interface AmenityFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  condominiumId: string
  amenity: AmenityListDto | null
  amenityTypes: AmenityType[]
}

function AmenityFormModal({ isOpen, onClose, onSuccess, condominiumId, amenity, amenityTypes }: AmenityFormModalProps) {
  const isEditing = !!amenity
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: amenity?.name || '',
    description: amenity?.description || '',
    type: amenity?.typeId || 1,
    capacity: amenity?.capacity || 10,
    requiresReservation: amenity?.requiresReservation ?? true,
    openingTime: amenity?.openingTime || '08:00',
    closingTime: amenity?.closingTime || '22:00',
    reservationFee: amenity?.reservationFee || null,
    minReservationHours: 1,
    maxReservationHours: 4,
    rules: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (isEditing && amenity) {
        const updateRequest: UpdateAmenityRequest = {
          name: formData.name,
          description: formData.description,
          capacity: formData.capacity,
          requiresReservation: formData.requiresReservation,
          openingTime: formData.openingTime,
          closingTime: formData.closingTime,
          reservationFee: formData.reservationFee,
          minReservationHours: formData.minReservationHours,
          maxReservationHours: formData.maxReservationHours,
          rules: formData.rules
        }
        await amenityService.update(amenity.id, updateRequest)
      } else {
        const createRequest: CreateAmenityRequest = {
          condominiumId,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          capacity: formData.capacity,
          requiresReservation: formData.requiresReservation,
          openingTime: formData.openingTime,
          closingTime: formData.closingTime,
          reservationFee: formData.reservationFee,
          minReservationHours: formData.minReservationHours,
          maxReservationHours: formData.maxReservationHours,
          rules: formData.rules
        }
        await amenityService.create(createRequest)
      }
      onSuccess()
    } catch (err) {
      setError(isEditing ? 'Error al actualizar amenidad' : 'Error al crear amenidad')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Amenidad' : 'Nueva Amenidad'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Ej: Alberca Principal"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: Number(e.target.value) })}
                disabled={isEditing}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50"
              >
                {amenityTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.displayName}</option>
                ))}
              </select>
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Capacidad *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            {/* Opening Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hora de Apertura *
              </label>
              <input
                type="time"
                required
                value={formData.openingTime}
                onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            {/* Closing Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hora de Cierre *
              </label>
              <input
                type="time"
                required
                value={formData.closingTime}
                onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descripción
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                placeholder="Descripción de la amenidad..."
              />
            </div>

            {/* Requires Reservation */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requiresReservation}
                  onChange={(e) => setFormData({ ...formData, requiresReservation: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Requiere reservación previa
                </span>
              </label>
            </div>

            {/* Reservation Fee */}
            {formData.requiresReservation && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Costo por Reservación (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.reservationFee || ''}
                    onChange={(e) => setFormData({ ...formData, reservationFee: e.target.value ? Number(e.target.value) : null })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
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
              {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Amenidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
