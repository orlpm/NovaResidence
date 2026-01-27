import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { residentService } from '../../lib/residentService'
import { amenityService, AmenityListDto } from '../../lib/amenityService'
import { reservationService, CreateReservationRequest } from '../../lib/reservationService'
import { ArrowLeftIcon, CalendarIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

function NewReservation() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amenities, setAmenities] = useState<AmenityListDto[]>([])
  const [residentInfo, setResidentInfo] = useState<any>(null)
  const [condominiumId, setCondominiumId] = useState<string>('')
  
  const [formData, setFormData] = useState({
    amenityId: '',
    reservationDate: '',
    startTime: '',
    endTime: '',
    numberOfGuests: 1,
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [user?.id])

  const loadData = async () => {
    if (!user?.id) return
    
    try {
      // Get resident info
      const resident = await residentService.getResidentInfo(user.id)
      if (!resident) {
        toast.error('No se encontró información de residente')
        navigate('/resident')
        return
      }
      setResidentInfo(resident)

      // Use condominiumId from resident info directly
      if (resident.condominiumId) {
        setCondominiumId(resident.condominiumId)
        try {
          const amenitiesData = await amenityService.getByCondominium(resident.condominiumId)
          // Filter only active amenities that require reservation
          setAmenities(amenitiesData.filter(a => a.isActive && a.requiresReservation))
        } catch (e) {
          console.warn('Error loading amenities:', e)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!residentInfo || !formData.amenityId || !formData.reservationDate || !formData.startTime || !formData.endTime) {
      toast.error('Por favor complete todos los campos requeridos')
      return
    }

    setSubmitting(true)

    try {
      const request: CreateReservationRequest = {
        amenityId: formData.amenityId,
        residentId: residentInfo.id,
        unitId: residentInfo.unitId,
        condominiumId: condominiumId,
        reservationDate: formData.reservationDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        numberOfGuests: formData.numberOfGuests,
        notes: formData.notes || null
      }

      await reservationService.create(request)
      toast.success('Reservación creada exitosamente')
      navigate('/resident/reservations')
    } catch (error: any) {
      console.error('Error creating reservation:', error)
      toast.error(error.response?.data?.message || 'Error al crear la reservación')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedAmenity = amenities.find(a => a.id === formData.amenityId)

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/resident/reservations')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Volver a Reservaciones</span>
        </button>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Nueva Reservación</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Reserva una amenidad del condominio
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-6">
          {/* Amenity Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Amenidad *
            </label>
            {amenities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No hay amenidades disponibles para reservar
              </p>
            ) : (
              <select
                value={formData.amenityId}
                onChange={(e) => setFormData({ ...formData, amenityId: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                required
              >
                <option value="">Selecciona una amenidad</option>
                {amenities.map((amenity) => (
                  <option key={amenity.id} value={amenity.id}>
                    {amenity.name} - Capacidad: {amenity.capacity} personas
                    {amenity.reservationFee ? ` ($${amenity.reservationFee})` : ' (Gratis)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Amenity Info */}
          {selectedAmenity && (
            <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4">
              <h3 className="font-semibold text-sky-800 dark:text-sky-200 mb-2">{selectedAmenity.name}</h3>
              <p className="text-sm text-sky-700 dark:text-sky-300">{selectedAmenity.description}</p>
              <div className="mt-2 text-sm text-sky-600 dark:text-sky-400">
                <span>Horario: {selectedAmenity.openingTime} - {selectedAmenity.closingTime}</span>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              Fecha *
            </label>
            <input
              type="date"
              value={formData.reservationDate}
              onChange={(e) => setFormData({ ...formData, reservationDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              required
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                Hora Inicio *
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                Hora Fin *
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Number of Guests */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <UserGroupIcon className="h-4 w-4 inline mr-1" />
              Número de Invitados
            </label>
            <input
              type="number"
              value={formData.numberOfGuests}
              onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) || 1 })}
              min="1"
              max={selectedAmenity?.capacity || 100}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            {selectedAmenity && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Capacidad máxima: {selectedAmenity.capacity} personas
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
              placeholder="Agrega notas adicionales..."
            />
          </div>

          {/* Cost Summary */}
          {selectedAmenity && selectedAmenity.reservationFee && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Costo de reservación:</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  ${selectedAmenity.reservationFee.toLocaleString('es-MX')}
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/resident/reservations')}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || amenities.length === 0}
              className="flex-1 px-6 py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creando...' : 'Crear Reservación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewReservation
