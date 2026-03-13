import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Loader2, Play, RefreshCw, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  incidentService,
  IncidentStatus,
  incidentPriorityNames,
  incidentStatusNames,
  type IncidentListDto
} from '../../lib/incidentService'
import { useAuthStore } from '../../stores/authStore'

export default function MaintenanceIncidents() {
  const { user } = useAuthStore()
  const [incidents, setIncidents] = useState<IncidentListDto[]>([])
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [resolvingIncident, setResolvingIncident] = useState<IncidentListDto | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [actualCost, setActualCost] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadAssignedIncidents = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await incidentService.getAssignedIncidents(user.id)
      setIncidents(data)
    } catch {
      setError('No se pudieron cargar tus incidencias asignadas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssignedIncidents()
  }, [user?.id])

  const filteredIncidents = useMemo(() => {
    if (selectedStatus === 'all') return incidents
    return incidents.filter(i => i.status === selectedStatus)
  }, [incidents, selectedStatus])

  const runTransition = async (incidentId: string, action: () => Promise<void>, successMessage: string) => {
    setProcessingId(incidentId)
    try {
      await action()
      toast.success(successMessage)
      await loadAssignedIncidents()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No fue posible actualizar el estatus')
    } finally {
      setProcessingId(null)
    }
  }

  const resolveIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvingIncident || !user?.id) return

    if (!resolutionNotes.trim()) {
      toast.error('La nota de resolución es obligatoria')
      return
    }

    setProcessingId(resolvingIncident.id)
    try {
      await incidentService.resolve(resolvingIncident.id, {
        resolvedById: user.id,
        resolutionNotes: resolutionNotes.trim(),
        actualCost: actualCost ? Number(actualCost) : undefined
      })
      toast.success('Incidencia resuelta')
      setResolvingIncident(null)
      setResolutionNotes('')
      setActualCost('')
      await loadAssignedIncidents()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'No fue posible resolver la incidencia')
    } finally {
      setProcessingId(null)
    }
  }

  const statusPills: Array<{ label: string; value: IncidentStatus | 'all' }> = [
    { label: 'Todas', value: 'all' },
    { label: 'Abiertas', value: IncidentStatus.Open },
    { label: 'Recibidas', value: IncidentStatus.Acknowledged },
    { label: 'En progreso', value: IncidentStatus.InProgress },
    { label: 'Resueltas', value: IncidentStatus.Resolved },
    { label: 'Cerradas', value: IncidentStatus.Closed }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mis Incidencias Asignadas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Flujo técnico para recepción, ejecución y cierre de incidencias.</p>
        </div>
        <button
          onClick={loadAssignedIncidents}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {statusPills.map((pill) => (
          <button
            key={pill.label}
            onClick={() => setSelectedStatus(pill.value)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              selectedStatus === pill.value
                ? 'bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300'
                : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 flex items-center justify-center text-gray-500 dark:text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Cargando incidencias...
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          <Wrench className="w-10 h-10 mx-auto mb-3" />
          No tienes incidencias asignadas para este filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => (
            <div key={incident.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">{incident.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{incident.description}</p>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-3">
                    <span>Prioridad: {incidentPriorityNames[incident.priority]}</span>
                    <span>Estatus: {incidentStatusNames[incident.status]}</span>
                    <span>Creada: {new Date(incident.createdAt).toLocaleString('es-MX')}</span>
                    {incident.unitNumber && <span>Unidad: {incident.unitNumber}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(incident.status === IncidentStatus.Open || incident.status === IncidentStatus.Reopened) && (
                    <button
                      onClick={() => runTransition(incident.id, () => incidentService.acknowledge(incident.id), 'Incidencia recibida')}
                      disabled={processingId === incident.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Recibir
                    </button>
                  )}

                  {incident.status === IncidentStatus.Acknowledged && (
                    <button
                      onClick={() => runTransition(incident.id, () => incidentService.startProgress(incident.id), 'Incidencia en progreso')}
                      disabled={processingId === incident.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-60"
                    >
                      <Play className="w-4 h-4" /> Iniciar progreso
                    </button>
                  )}

                  {incident.status === IncidentStatus.InProgress && (
                    <button
                      onClick={() => setResolvingIncident(incident)}
                      disabled={processingId === incident.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60"
                    >
                      <Clock3 className="w-4 h-4" /> Resolver
                    </button>
                  )}

                  {incident.status === IncidentStatus.Resolved && (
                    <button
                      onClick={() => runTransition(incident.id, () => incidentService.close(incident.id), 'Incidencia cerrada')}
                      disabled={processingId === incident.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Cerrar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolvingIncident && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Resolver incidencia</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{resolvingIncident.title}</p>
            </div>
            <form onSubmit={resolveIncident} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas de resolución</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  placeholder="Describe acciones y resultado..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Costo real (opcional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResolvingIncident(null)
                    setResolutionNotes('')
                    setActualCost('')
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingId === resolvingIncident.id}
                  className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white font-medium disabled:opacity-60"
                >
                  Confirmar resolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
