import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, LogIn, LogOut, ShieldCheck, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { visitService, VisitStatus, type VisitListDto } from '../../lib/visitService'
import { useAuthStore } from '../../stores/authStore'

export default function SecurityAccessControl() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState('')
  const [visits, setVisits] = useState<VisitListDto[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
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
        const data = await visitService.getTodayVisits(selectedCondominium)
        setVisits(data)
      } catch {
        setError('No se pudo cargar el control de accesos')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [selectedCondominium])

  const pending = useMemo(() => visits.filter(v => v.status === VisitStatus.Pending), [visits])
  const approved = useMemo(() => visits.filter(v => v.status === VisitStatus.Approved), [visits])
  const checkedIn = useMemo(() => visits.filter(v => v.status === VisitStatus.CheckedIn), [visits])

  const reload = async () => {
    if (!selectedCondominium) return
    const data = await visitService.getTodayVisits(selectedCondominium)
    setVisits(data)
  }

  const runAction = async (visitId: string, action: () => Promise<void>, successMessage: string) => {
    setProcessingId(visitId)
    try {
      await action()
      toast.success(successMessage)
      await reload()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Operación no completada')
    } finally {
      setProcessingId(null)
    }
  }

  const rejectVisit = async (visitId: string) => {
    if (!user?.id) return
    const reason = window.prompt('Motivo de rechazo (opcional):') || undefined
    await runAction(
      visitId,
      () => visitService.reject(visitId, user.id, reason),
      'Visita rechazada'
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Control de Accesos</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Flujo operativo para autorizar, registrar entrada y salida de visitantes.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      <div className="max-w-xl">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
          <p className="text-3xl font-bold text-yellow-600">{pending.length}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Aprobadas</p>
          <p className="text-3xl font-bold text-green-600">{approved.length}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">En el sitio</p>
          <p className="text-3xl font-bold text-blue-600">{checkedIn.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500 dark:text-gray-400">Cargando visitas de hoy...</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">Pendientes de autorización</div>
            {pending.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No hay pendientes.</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {pending.map(v => (
                  <div key={v.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{v.visitorName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Llegada estimada: {new Date(v.expectedArrival).toLocaleTimeString('es-MX')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => user?.id && runAction(v.id, () => visitService.approve(v.id, user.id), 'Visita aprobada')}
                        disabled={processingId === v.id || !user?.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        <CheckCircle className="w-4 h-4" /> Aprobar
                      </button>
                      <button
                        onClick={() => rejectVisit(v.id)}
                        disabled={processingId === v.id || !user?.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        <XCircle className="w-4 h-4" /> Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">Accesos activos</div>
            {(approved.length + checkedIn.length) === 0 ? (
              <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No hay accesos activos.</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...approved, ...checkedIn].map(v => (
                  <div key={v.id} className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{v.visitorName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{v.statusName}</p>
                    </div>
                    <div className="flex gap-2">
                      {v.status === VisitStatus.Approved && (
                        <button
                          onClick={() => user?.id && runAction(v.id, () => visitService.checkIn(v.id, user.id), 'Entrada registrada')}
                          disabled={processingId === v.id || !user?.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          <LogIn className="w-4 h-4" /> Registrar Entrada
                        </button>
                      )}
                      {v.status === VisitStatus.CheckedIn && (
                        <button
                          onClick={() => user?.id && runAction(v.id, () => visitService.checkOut(v.id, user.id), 'Salida registrada')}
                          disabled={processingId === v.id || !user?.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          <LogOut className="w-4 h-4" /> Registrar Salida
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 mt-0.5 text-sky-600" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Este módulo opera sobre visitas del día en tiempo real para control de ingreso y egreso.
        </p>
      </div>
    </div>
  )
}
