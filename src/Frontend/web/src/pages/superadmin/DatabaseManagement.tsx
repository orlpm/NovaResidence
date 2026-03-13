import { useEffect, useState } from 'react'
import { Database, RefreshCw, Play } from 'lucide-react'
import { superAdminService, type DatabaseOverviewDto, type DatabaseMigrateResultDto } from '../../lib/superAdminService'

export default function DatabaseManagement() {
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [overview, setOverview] = useState<DatabaseOverviewDto | null>(null)
  const [lastMigrationResult, setLastMigrationResult] = useState<DatabaseMigrateResultDto | null>(null)

  const loadOverview = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await superAdminService.getDatabaseOverview()
      setOverview(data)
    } catch {
      setError('No se pudo cargar el estado de base de datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
  }, [])

  const handleApplyMigrations = async () => {
    if (!confirm('¿Aplicar migraciones pendientes ahora?')) return

    try {
      setMigrating(true)
      setError(null)
      setSuccess(null)
      const result = await superAdminService.applyMigrations()
      setLastMigrationResult(result)
      setSuccess(result.message)
      await loadOverview()
    } catch {
      setError('No se pudieron aplicar las migraciones')
    } finally {
      setMigrating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Database className="w-8 h-8 text-cyan-400" />
            Base de Datos
          </h1>
          <p className="text-gray-400 mt-1">Estado, migraciones y volumen de datos por tabla</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadOverview}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar
          </button>
          <button
            onClick={handleApplyMigrations}
            disabled={migrating}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {migrating ? 'Aplicando...' : 'Aplicar migraciones'}
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300">{error}</div>}
      {success && <div className="p-3 rounded-lg bg-green-900/30 border border-green-700 text-green-300">{success}</div>}

      {loading && <div className="text-gray-300">Cargando estado de base de datos...</div>}

      {overview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-sm text-gray-400">Proveedor</p>
              <p className="text-white font-semibold mt-2">{overview.provider}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-sm text-gray-400">Conexión</p>
              <p className={`font-semibold mt-2 ${overview.canConnect ? 'text-green-400' : 'text-red-400'}`}>
                {overview.canConnect ? 'Conectada' : 'Sin conexión'}
              </p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-sm text-gray-400">Migraciones Aplicadas</p>
              <p className="text-white font-semibold mt-2">{overview.appliedMigrationsCount}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-sm text-gray-400">Migraciones Pendientes</p>
              <p className="text-white font-semibold mt-2">{overview.pendingMigrationsCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h2 className="text-white font-semibold mb-3">Pendientes</h2>
              {overview.pendingMigrations.length === 0 ? (
                <p className="text-sm text-green-400">No hay migraciones pendientes.</p>
              ) : (
                <ul className="space-y-2 text-sm text-gray-300">
                  {overview.pendingMigrations.map(m => (
                    <li key={m} className="px-3 py-2 rounded bg-gray-900 border border-gray-700 break-all">{m}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h2 className="text-white font-semibold mb-3">Conteo por Tabla</h2>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {overview.tableStats.map(stat => (
                  <div key={stat.table} className="flex items-center justify-between px-3 py-2 rounded bg-gray-900 border border-gray-700 text-sm">
                    <span className="text-gray-300">{stat.table}</span>
                    <span className="text-white font-semibold">{stat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {lastMigrationResult && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h2 className="text-white font-semibold mb-2">Última ejecución de migraciones</h2>
              <p className="text-sm text-gray-300">{lastMigrationResult.message}</p>
              <p className="text-sm text-gray-400 mt-1">Aplicadas: {lastMigrationResult.appliedCount}</p>
              {lastMigrationResult.appliedMigrations.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-gray-300 list-disc list-inside">
                  {lastMigrationResult.appliedMigrations.map(m => <li key={m}>{m}</li>)}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
