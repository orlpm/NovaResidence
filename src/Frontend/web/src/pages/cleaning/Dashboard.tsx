import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IncidentStatus, incidentService, incidentStatusNames, type IncidentListDto } from '../../lib/incidentService'
import { useAuthStore } from '../../stores/authStore'

export default function CleaningDashboard() {
  const { user } = useAuthStore()
  const [incidents, setIncidents] = useState<IncidentListDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadAssigned = async () => {
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

    loadAssigned()
  }, [user?.id])

  const stats = useMemo(
    () => [
      {
        name: 'Asignadas',
        value: incidents.length,
        icon: AlertCircle,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-100 dark:bg-cyan-900/20'
      },
      {
        name: 'Resueltas',
        value: incidents.filter(i => i.status === IncidentStatus.Resolved || i.status === IncidentStatus.Closed).length,
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/20'
      }
    ],
    [incidents]
  )

  const nextTasks = useMemo(
    () => incidents
      .filter(i => i.status !== IncidentStatus.Closed)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 5),
    [incidents]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Limpieza</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Control operativo de incidencias del equipo de limpieza.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className={`p-3 rounded-lg ${stat.bgColor} inline-block`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-600" />
            Mis tareas de limpieza
          </h2>
          <Link
            to="/cleaning/incidents"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400"
          >
            Abrir bandeja
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando tareas...
          </div>
        ) : nextTasks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No tienes incidencias activas asignadas.</p>
        ) : (
          <div className="space-y-3">
            {nextTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {incidentStatusNames[task.status]} · {new Date(task.createdAt).toLocaleString('es-MX')}
                  </p>
                </div>
                <Link
                  to="/cleaning/incidents"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                >
                  Abrir
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
