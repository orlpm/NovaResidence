import { useEffect, useMemo, useState } from 'react'
import { Briefcase, CalendarClock, CheckCircle2, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  incidentService,
  IncidentStatus,
  type IncidentListDto
} from '../../lib/incidentService'
import { useAuthStore } from '../../stores/authStore'
import { providerAppointmentService, type ProviderAppointmentDto } from '../../lib/operationsService'

export default function ProviderDashboard() {
  const { user } = useAuthStore()
  const [incidents, setIncidents] = useState<IncidentListDto[]>([])
  const [appointments, setAppointments] = useState<ProviderAppointmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<IncidentListDto | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const loadIncidents = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [data, visits] = await Promise.all([
        incidentService.getAssignedIncidents(user.id),
        providerAppointmentService.getByProvider(user.id)
      ])
      setIncidents(data)
      setAppointments(visits)
    } catch {
      toast.error('No se pudieron cargar los servicios asignados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIncidents()
  }, [user?.id])

  const openIncidents = useMemo(
    () => incidents.filter(item => item.status !== IncidentStatus.Resolved && item.status !== IncidentStatus.Closed),
    [incidents]
  )
  const completedIncidents = useMemo(
    () => incidents.filter(item => item.status === IncidentStatus.Resolved || item.status === IncidentStatus.Closed),
    [incidents]
  )

  const resolveIncident = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!resolving || !user?.id || !notes.trim()) return
    setSaving(true)
    try {
      await incidentService.resolve(resolving.id, {
        resolvedById: user.id,
        resolutionNotes: notes.trim(),
        actualCost: 0
      })
      toast.success('Servicio concluido')
      setResolving(null)
      setNotes('')
      await loadIncidents()
    } catch {
      toast.error('No se pudo concluir el servicio')
    } finally {
      setSaving(false)
    }
  }

  const cards = [
    { title: 'Órdenes asignadas', value: String(openIncidents.length), icon: ClipboardList, color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-900/20' },
    { title: 'Servicios completados', value: String(completedIncidents.length), icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/20' },
    { title: 'Próximas visitas', value: String(appointments.filter(item => item.status === 0).length), icon: CalendarClock, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/20' }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Proveedor</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Seguimiento de actividades y servicios asignados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className={`p-3 rounded-lg ${card.bgColor} inline-block`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agenda</h2>
        </div>
        {appointments.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No hay visitas programadas.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map(item => (
              <div key={item.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-sm text-gray-500">{new Date(item.scheduledAt).toLocaleString()} · {item.statusName}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Servicios asignados</h2>
        </div>
        {loading ? (
          <p className="text-gray-500">Cargando servicios...</p>
        ) : openIncidents.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No tienes servicios pendientes.</p>
        ) : (
          <div className="space-y-3">
            {openIncidents.map(incident => (
              <div key={incident.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{incident.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{incident.description}</p>
                </div>
                <button
                  onClick={() => setResolving(incident)}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium"
                >
                  Concluir servicio
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {resolving && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={resolveIncident} className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Concluir servicio</h3>
            <p className="text-sm text-gray-500">{resolving.title}</p>
            <textarea
              required
              rows={4}
              value={notes}
              onChange={event => setNotes(event.target.value)}
              placeholder="Describe el servicio realizado..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setResolving(null)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-medium disabled:opacity-60">
                {saving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
