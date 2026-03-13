import { useEffect, useMemo, useState } from 'react'
import { Shield, Users, ClipboardList, AlertCircle, Camera } from 'lucide-react'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { visitService, VisitStatus, type VisitListDto } from '../../lib/visitService'
import { incidentService, IncidentStatus, type IncidentListDto } from '../../lib/incidentService'
import { condominiumMapService } from '../../lib/condominiumMapService'
import { useAuthStore } from '../../stores/authStore'

const cameraPattern = /(camera|cámara|camara|cctv|vigilancia)/i

export default function SecurityDashboard() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState('')
  const [visits, setVisits] = useState<VisitListDto[]>([])
  const [incidents, setIncidents] = useState<IncidentListDto[]>([])
  const [cameraCount, setCameraCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCondominiums = async () => {
      try {
        const data = await condominiumService.getAllCondominiums(user?.id)
        setCondominiums(data)
        if (data.length > 0) {
          setSelectedCondominium(data[0].id)
        }
      } catch {
        setError('No se pudieron cargar los condominios')
      }
    }

    loadCondominiums()
  }, [user?.id])

  useEffect(() => {
    const loadFeed = async () => {
      if (!selectedCondominium) return
      setLoading(true)
      setError(null)
      try {
        const [todayVisits, condoIncidents, maps] = await Promise.all([
          visitService.getTodayVisits(selectedCondominium),
          incidentService.getByCondominium(selectedCondominium),
          condominiumMapService.getByCondominium(selectedCondominium)
        ])

        const mapDetails = await Promise.all(maps.map(m => condominiumMapService.getById(m.id)))
        const cameras = mapDetails.flatMap(m => m.markers)
          .filter(marker => marker.isActive)
          .filter(marker =>
            cameraPattern.test(marker.layerName || '') ||
            cameraPattern.test(marker.label || '') ||
            cameraPattern.test(marker.tooltip || '') ||
            cameraPattern.test(marker.externalReference || '')
          )

        setVisits(todayVisits)
        setIncidents(condoIncidents)
        setCameraCount(cameras.length)
      } catch {
        setError('No se pudo cargar la información operativa')
      } finally {
        setLoading(false)
      }
    }

    loadFeed()
  }, [selectedCondominium])

  const activeIncidents = useMemo(
    () => incidents.filter(i => i.status !== IncidentStatus.Resolved && i.status !== IncidentStatus.Closed),
    [incidents]
  )

  const pendingVisitors = useMemo(
    () => visits.filter(v => v.status === VisitStatus.Pending).slice(0, 5),
    [visits]
  )

  const recentAccesses = useMemo(
    () => [...visits]
      .sort((a, b) => {
        const aTime = new Date(a.checkInAt || a.expectedArrival).getTime()
        const bTime = new Date(b.checkInAt || b.expectedArrival).getTime()
        return bTime - aTime
      })
      .slice(0, 6),
    [visits]
  )

  const accessRecords = useMemo(
    () => visits.filter(v => v.status === VisitStatus.CheckedIn || v.status === VisitStatus.CheckedOut).length,
    [visits]
  )

  const urgentAlerts = useMemo(
    () => activeIncidents.filter(i => i.priorityName?.toLowerCase().includes('urg')).length,
    [activeIncidents]
  )

  const stats = [
    {
      name: 'Visitantes Hoy',
      value: visits.length,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20'
    },
    {
      name: 'Accesos Registrados',
      value: accessRecords,
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      name: 'Incidencias Activas',
      value: activeIncidents.length,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    },
    {
      name: 'Cámaras Detectadas',
      value: cameraCount,
      icon: Camera,
      color: 'text-sky-600',
      bgColor: 'bg-sky-100 dark:bg-sky-900/20'
    },
    {
      name: 'Alertas Urgentes',
      value: urgentAlerts,
      icon: Shield,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Vigilancia</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Feed operativo de accesos, visitantes, incidencias y cámaras.
          </p>
        </div>

        <div className="w-full md:w-80">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condominio</label>
          <select
            value={selectedCondominium}
            onChange={(e) => setSelectedCondominium(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            {condominiums.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500 dark:text-gray-400">Cargando feed operativo...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Últimos Accesos</h2>
            <div className="space-y-3">
              {recentAccesses.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Sin movimientos recientes.</p>
              ) : recentAccesses.map((record) => (
                <div key={record.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{record.visitorName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(record.checkInAt || record.expectedArrival).toLocaleTimeString('es-MX')} • {record.typeName}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {record.statusName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Visitantes Pendientes</h2>
            <div className="space-y-3">
              {pendingVisitors.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No hay visitantes pendientes.</p>
              ) : pendingVisitors.map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{visitor.visitorName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Llegada estimada: {new Date(visitor.expectedArrival).toLocaleTimeString('es-MX')}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-lg text-sm font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    Pendiente
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
