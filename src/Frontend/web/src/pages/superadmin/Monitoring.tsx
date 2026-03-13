import { useEffect, useState } from 'react'
import { Activity, RefreshCw, Users, Building2, CreditCard, AlertTriangle, Footprints, Database } from 'lucide-react'
import { superAdminService, type MonitoringSummaryDto } from '../../lib/superAdminService'

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{label}</p>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-white mt-2">{value}</p>
    </div>
  )
}

export default function Monitoring() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<MonitoringSummaryDto | null>(null)

  const loadMonitoring = async () => {
    try {
      setLoading(true)
      setError(null)
      const summary = await superAdminService.getMonitoring()
      setData(summary)
    } catch {
      setError('No se pudo cargar el monitoreo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMonitoring()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-400" />
            Monitoreo del Sistema
          </h1>
          <p className="text-gray-400 mt-1">Estado operativo en tiempo real de la plataforma</p>
        </div>
        <button
          onClick={loadMonitoring}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300">{error}</div>}

      {loading && <div className="text-gray-300">Cargando monitoreo...</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Usuarios Totales" value={data.totalUsers} icon={Users} color="text-purple-400" />
            <StatCard label="Condominios" value={data.totalCondominiums} icon={Building2} color="text-blue-400" />
            <StatCard label="Suscripciones Activas" value={data.activeSubscriptions} icon={CreditCard} color="text-green-400" />
            <StatCard label="Incidencias Abiertas" value={data.openIncidents} icon={AlertTriangle} color="text-orange-400" />
            <StatCard label="Visitas Pendientes" value={data.pendingVisits} icon={Footprints} color="text-cyan-400" />
            <StatCard label="Pagos sin Verificar" value={data.unverifiedPayments} icon={CreditCard} color="text-yellow-400" />
            <StatCard label="Memoria Proceso (MB)" value={data.processMemoryMb.toFixed(2)} icon={Activity} color="text-pink-400" />
            <StatCard label="Migraciones Pendientes" value={data.pendingMigrations} icon={Database} color="text-red-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h2 className="text-white font-semibold mb-3">Salud de Servicios</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Conexión DB</span>
                  <span className={data.databaseConnected ? 'text-green-400' : 'text-red-400'}>
                    {data.databaseConnected ? 'Conectada' : 'Sin conexión'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Uptime</span>
                  <span className="text-white">{data.uptimeMinutes.toFixed(1)} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Inicio de proceso</span>
                  <span className="text-white">{new Date(data.processStartedAt).toLocaleString('es-MX')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Generado</span>
                  <span className="text-white">{new Date(data.generatedAt).toLocaleString('es-MX')}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h2 className="text-white font-semibold mb-3">Actividad General</h2>
              <div className="space-y-2 text-sm text-gray-300">
                <p>Usuarios activos: <strong>{data.activeUsers}</strong> de <strong>{data.totalUsers}</strong>.</p>
                <p>Incidencias abiertas: <strong>{data.openIncidents}</strong>.</p>
                <p>Visitas por atender: <strong>{data.pendingVisits}</strong>.</p>
                <p>Pagos pendientes de validación: <strong>{data.unverifiedPayments}</strong>.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
