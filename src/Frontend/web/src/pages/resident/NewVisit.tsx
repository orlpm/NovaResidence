import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { residentService } from '../../lib/residentService'
import { parkingService, type VehicleDto } from '../../lib/operationsService'
import { 
  visitService, 
  VisitType, 
  visitTypeNames 
} from '../../lib/visitService'
import { 
  ArrowLeft, 
  Users, 
  Car, 
  Calendar, 
  Phone, 
  Mail, 
  FileText, 
  User, 
  Package, 
  Wrench, 
  HardHat, 
  Home, 
  Heart, 
  HelpCircle 
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ResidentInfo {
  id: string
  unitId: string
  unitNumber: string
  buildingName: string
  condominiumId?: string
}

export default function NewVisit() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [residentInfo, setResidentInfo] = useState<ResidentInfo | null>(null)
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState('')

  const [formData, setFormData] = useState({
    visitorName: '',
    visitorIdentification: '',
    visitorPhone: '',
    visitorEmail: '',
    visitorCount: 1,
    vehiclePlate: '',
    vehicleDescription: '',
    type: VisitType.Personal,
    purpose: '',
    notes: '',
    expectedArrival: '',
    expectedDeparture: ''
  })

  const nowLocalDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  useEffect(() => {
    loadResidentInfo()
  }, [user?.id])

  const loadResidentInfo = async () => {
    if (!user?.id) return
    try {
      const resident = await residentService.getResidentInfo(user.id)
      if (resident) {
        setResidentInfo({
          id: resident.id,
          unitId: resident.unitId,
          unitNumber: resident.unitNumber,
          buildingName: resident.buildingName,
          condominiumId: resident.condominiumId
        })
        const unitVehicles = await parkingService.getUnitVehicles(resident.unitId)
        setVehicles(unitVehicles)
      }
    } catch (error) {
      console.error('Error loading resident info:', error)
      toast.error('Error al cargar información del residente')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!residentInfo || !user?.id) {
      toast.error('No se encontró información del residente')
      return
    }

    if (!formData.visitorName.trim()) {
      toast.error('Ingresa el nombre del visitante')
      return
    }

    if (!formData.expectedArrival) {
      toast.error('Selecciona la fecha y hora de llegada esperada')
      return
    }

    const expectedArrivalDate = new Date(formData.expectedArrival)
    if (expectedArrivalDate <= new Date()) {
      toast.error('La hora de llegada debe ser futura')
      return
    }

    if (!residentInfo.condominiumId) {
      toast.error('No se pudo identificar el condominio')
      return
    }

    setSubmitting(true)
    try {
      await visitService.create({
        condominiumId: residentInfo.condominiumId,
        unitId: residentInfo.unitId,
        requestedById: user.id,
        visitorName: formData.visitorName,
        type: formData.type,
        expectedArrival: expectedArrivalDate.toISOString(),
        expectedDeparture: formData.expectedDeparture 
          ? new Date(formData.expectedDeparture).toISOString() 
          : null,
        visitorIdentification: formData.visitorIdentification || null,
        visitorPhone: formData.visitorPhone || null,
        visitorEmail: formData.visitorEmail || null,
        visitorCount: formData.visitorCount,
        vehiclePlate: formData.vehiclePlate || null,
        vehicleDescription: formData.vehicleDescription || null,
        residentVehicleId: selectedVehicleId || null,
        purpose: formData.purpose || null,
        notes: formData.notes || null
      })

      toast.success('Visita registrada exitosamente')
      navigate('/resident/visits')
    } catch (error: any) {
      console.error('Error creating visit:', error)
      const msg = error?.response?.data?.message || 'Error al registrar la visita'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const visitTypeIcons: Record<number, JSX.Element> = {
    [VisitType.Personal]: <User className="w-5 h-5" />,
    [VisitType.Delivery]: <Package className="w-5 h-5" />,
    [VisitType.Service]: <Wrench className="w-5 h-5" />,
    [VisitType.Contractor]: <HardHat className="w-5 h-5" />,
    [VisitType.RealEstate]: <Home className="w-5 h-5" />,
    [VisitType.Medical]: <Heart className="w-5 h-5" />,
    [VisitType.Other]: <HelpCircle className="w-5 h-5" />
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/resident/visits')}
          className="flex items-center gap-2 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 mb-4 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a Mis Visitas
        </button>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Registrar Nueva Visita</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Unidad {residentInfo?.unitNumber} - {residentInfo?.buildingName}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Visit Type Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500" />
            Tipo de Visita
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(visitTypeNames).map(([key, name]) => {
              const typeKey = Number(key) as VisitType
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: typeKey }))}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-sm font-semibold ${
                    formData.type === typeKey
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {visitTypeIcons[typeKey] || <HelpCircle className="w-5 h-5" />}
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Visitor Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-sky-500" />
            Información del Visitante
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nombre del Visitante *
              </label>
              <input
                type="text"
                required
                value={formData.visitorName}
                onChange={e => setFormData(prev => ({ ...prev, visitorName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Nombre completo"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                <Phone className="w-4 h-4 inline mr-1" /> Teléfono
              </label>
              <input
                type="tel"
                value={formData.visitorPhone}
                onChange={e => setFormData(prev => ({ ...prev, visitorPhone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                <Mail className="w-4 h-4 inline mr-1" /> Email
              </label>
              <input
                type="email"
                value={formData.visitorEmail}
                onChange={e => setFormData(prev => ({ ...prev, visitorEmail: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                <FileText className="w-4 h-4 inline mr-1" /> Identificación
              </label>
              <input
                type="text"
                value={formData.visitorIdentification}
                onChange={e => setFormData(prev => ({ ...prev, visitorIdentification: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Cédula / Pasaporte"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                <Users className="w-4 h-4 inline mr-1" /> Cantidad de Personas
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.visitorCount}
                onChange={e => setFormData(prev => ({ ...prev, visitorCount: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-sky-500" />
            Vehículo (Opcional)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Vehículo registrado</label>
              <select
                value={selectedVehicleId}
                onChange={e => {
                  const vehicleId = e.target.value
                  setSelectedVehicleId(vehicleId)
                  const vehicle = vehicles.find(item => item.id === vehicleId)
                  if (!vehicle) return
                  const description = [vehicle.brand, vehicle.color].filter(Boolean).join(' ')
                  setFormData(prev => ({ ...prev, vehiclePlate: vehicle.plate, vehicleDescription: description }))
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="">Otro vehículo, capturar placa</option>
                {vehicles.map(item => (
                  <option key={item.id} value={item.id}>{item.plate} · {item.brand}{item.residentName ? ` · ${item.residentName}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Placa</label>
              <input
                type="text"
                value={formData.vehiclePlate}
                onChange={e => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="ABC-1234"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Descripción del Vehículo</label>
              <input
                type="text"
                value={formData.vehicleDescription}
                onChange={e => setFormData(prev => ({ ...prev, vehicleDescription: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Toyota Corolla Blanco"
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-500" />
            Fecha y Hora
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Llegada Esperada *
              </label>
              <input
                type="datetime-local"
                required
                min={nowLocalDateTime}
                value={formData.expectedArrival}
                onChange={e => setFormData(prev => ({ ...prev, expectedArrival: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Salida Esperada
              </label>
              <input
                type="datetime-local"
                value={formData.expectedDeparture}
                onChange={e => setFormData(prev => ({ ...prev, expectedDeparture: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Purpose & Notes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" />
            Detalles Adicionales
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Motivo de la Visita</label>
              <input
                type="text"
                value={formData.purpose}
                onChange={e => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Ej: Reunión familiar, Reparación de plomería..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Notas</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Información adicional para seguridad..."
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/resident/visits')}
            className="flex-1 py-3 px-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Registrando...
              </span>
            ) : (
              'Registrar Visita'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
