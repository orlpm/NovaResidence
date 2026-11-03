import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Search, Filter, Clock3, User } from 'lucide-react'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { visitService, VisitStatus, visitStatusNames, type VisitListDto } from '../../lib/visitService'
import { useAuthStore } from '../../stores/authStore'

export default function SecurityAccessLog() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState('')
  const [records, setRecords] = useState<VisitListDto[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VisitStatus | null>(null)
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
    const load = async () => {
      if (!selectedCondominium) return
      setLoading(true)
      setError(null)
      try {
        const now = new Date()
        const fromDate = new Date(now)
        fromDate.setDate(now.getDate() - 7)
        const endOfToday = new Date(now)
        endOfToday.setHours(23, 59, 59, 999)
        const data = await visitService.getByCondominium(selectedCondominium, {
          status: statusFilter ?? undefined,
          fromDate: fromDate.toISOString(),
          toDate: endOfToday.toISOString()
        })
        setRecords(data)
      } catch {
        setError('Error al cargar el registro de accesos')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [selectedCondominium, statusFilter])

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(r =>
      r.visitorName.toLowerCase().includes(q) ||
      (r.visitorPhone || '').toLowerCase().includes(q) ||
      (r.vehiclePlate || '').toLowerCase().includes(q) ||
      (r.purpose || '').toLowerCase().includes(q)
    )
  }, [records, search])

  const formatDateTime = (value?: string | null) => {
    if (!value) return '—'
    return new Date(value).toLocaleString('es-MX')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Registro de Accesos</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Consulta de entradas, salidas y estatus operativos de visitas.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estatus</label>
          <select
            value={statusFilter !== null ? String(statusFilter) : ''}
            onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) as VisitStatus : null)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            <option value="">Todos</option>
            {Object.entries(visitStatusNames).map(([value, name]) => (
              <option key={value} value={value}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, teléfono, placa..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <ClipboardList className="w-4 h-4" />
            <span className="font-medium">Últimos 7 días</span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{filteredRecords.length} registros</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando registros...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No hay movimientos en el periodo seleccionado.</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredRecords.map((record) => {
              const entryDate = record.checkInAt || record.expectedArrival
              const exitDate = record.checkOutAt

              return (
                <div key={record.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{record.visitorName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Unidad: {record.unitId.slice(0, 8)}...</p>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{record.statusName}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">Entrada: {formatDateTime(entryDate)}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">Salida: {formatDateTime(exitDate)}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {(record.vehiclePlate || record.visitorPhone || record.purpose || 'Sin detalle')}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><Filter className="w-4 h-4" />Pendientes</div>
          <p className="text-2xl font-bold text-yellow-600">
            {records.filter(r => r.status === VisitStatus.Pending).length}
          </p>
        </div>
        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><Clock3 className="w-4 h-4" />En sitio</div>
          <p className="text-2xl font-bold text-blue-600">
            {records.filter(r => r.status === VisitStatus.CheckedIn).length}
          </p>
        </div>
        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><User className="w-4 h-4" />Finalizadas</div>
          <p className="text-2xl font-bold text-green-600">
            {records.filter(r => r.status === VisitStatus.CheckedOut).length}
          </p>
        </div>
      </div>
    </div>
  )
}
