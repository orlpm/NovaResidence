import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Car, FileText, Mail, Phone, Save, User, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { VisitStatus, VisitType, visitService, visitTypeNames, type VisitDetailDto } from '../../lib/visitService'

function toLocalDateTime(dateValue?: string | null): string {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function EditVisit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [visit, setVisit] = useState<VisitDetailDto | null>(null)
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

  useEffect(() => {
    if (id) {
      loadVisit(id)
    }
  }, [id])

  const loadVisit = async (visitId: string) => {
    setLoading(true)
    try {
      const data = await visitService.getById(visitId)
      if (data.status !== VisitStatus.Pending) {
        toast.error('Solo se pueden editar visitas pendientes')
        navigate(`/resident/visits/${visitId}`)
        return
      }

      setVisit(data)
      setFormData({
        visitorName: data.visitorName || '',
        visitorIdentification: data.visitorIdentification || '',
        visitorPhone: data.visitorPhone || '',
        visitorEmail: data.visitorEmail || '',
        visitorCount: data.visitorCount || 1,
        vehiclePlate: data.vehiclePlate || '',
        vehicleDescription: data.vehicleDescription || '',
        type: data.type,
        purpose: data.purpose || '',
        notes: data.notes || '',
        expectedArrival: toLocalDateTime(data.expectedArrival),
        expectedDeparture: toLocalDateTime(data.expectedDeparture)
      })
    } catch {
      toast.error('No fue posible cargar la visita')
      navigate('/resident/visits')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

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

    if (formData.expectedDeparture) {
      const expectedDepartureDate = new Date(formData.expectedDeparture)
      if (expectedDepartureDate <= expectedArrivalDate) {
        toast.error('La salida esperada debe ser mayor que la llegada')
        return
      }
    }

    setSubmitting(true)
    try {
      await visitService.update(id, {
        visitorName: formData.visitorName.trim(),
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
        purpose: formData.purpose || null,
        notes: formData.notes || null
      })

      toast.success('Visita actualizada exitosamente')
      navigate(`/resident/visits/${id}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al actualizar visita')
    } finally {
      setSubmitting(false)
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

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate(`/resident/visits/${visit.id}`)}
          className="flex items-center gap-2 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 mb-4 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al detalle
        </button>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">Editar Visita</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Actualiza la información de tu visita pendiente</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-sky-500" />
            Información del Visitante
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Nombre del Visitante *</label>
              <input
                type="text"
                required
                value={formData.visitorName}
                onChange={e => setFormData(prev => ({ ...prev, visitorName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"><Phone className="w-4 h-4 inline mr-1" /> Teléfono</label>
              <input
                type="tel"
                value={formData.visitorPhone}
                onChange={e => setFormData(prev => ({ ...prev, visitorPhone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"><Mail className="w-4 h-4 inline mr-1" /> Email</label>
              <input
                type="email"
                value={formData.visitorEmail}
                onChange={e => setFormData(prev => ({ ...prev, visitorEmail: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"><FileText className="w-4 h-4 inline mr-1" /> Identificación</label>
              <input
                type="text"
                value={formData.visitorIdentification}
                onChange={e => setFormData(prev => ({ ...prev, visitorIdentification: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"><Users className="w-4 h-4 inline mr-1" /> Cantidad de Personas</label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.visitorCount}
                onChange={e => setFormData(prev => ({ ...prev, visitorCount: parseInt(e.target.value) || 1 }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo de Visita</label>
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: Number(e.target.value) as VisitType }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                {Object.entries(visitTypeNames).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-sky-500" />
            Vehículo (Opcional)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Placa</label>
              <input
                type="text"
                value={formData.vehiclePlate}
                onChange={e => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Descripción del Vehículo</label>
              <input
                type="text"
                value={formData.vehicleDescription}
                onChange={e => setFormData(prev => ({ ...prev, vehicleDescription: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-500" />
            Fecha y Hora
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Llegada Esperada *</label>
              <input
                type="datetime-local"
                required
                value={formData.expectedArrival}
                onChange={e => setFormData(prev => ({ ...prev, expectedArrival: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Salida Esperada</label>
              <input
                type="datetime-local"
                value={formData.expectedDeparture}
                onChange={e => setFormData(prev => ({ ...prev, expectedDeparture: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

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
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Notas</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate(`/resident/visits/${visit.id}`)}
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
                Guardando...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2"><Save className="w-5 h-5" /> Guardar Cambios</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
