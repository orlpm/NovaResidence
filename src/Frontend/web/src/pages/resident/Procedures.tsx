import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, ClipboardCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { procedureService, ProcedureStatus, procedureStatusNames, type ProcedureDto } from '../../lib/procedureService'
import { useAuthStore } from '../../stores/authStore'

export default function ResidentProcedures() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [procedures, setProcedures] = useState<ProcedureDto[]>([])
  const [completingId, setCompletingId] = useState<string | null>(null)

  const loadProcedures = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await procedureService.getByResidentUser(user.id)
      setProcedures(data)
    } catch {
      setError('No se pudieron cargar los trámites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProcedures()
  }, [user?.id])

  const pendingCount = useMemo(
    () => procedures.filter(p => p.status === ProcedureStatus.Pending || p.status === ProcedureStatus.Overdue).length,
    [procedures]
  )

  const completeProcedure = async (procedure: ProcedureDto) => {
    setCompletingId(procedure.id)
    try {
      await procedureService.complete(procedure.id)
      toast.success('Trámite marcado como completado')
      await loadProcedures()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No fue posible completar el trámite')
    } finally {
      setCompletingId(null)
    }
  }

  const statusBadge = (status: ProcedureStatus) => {
    switch (status) {
      case ProcedureStatus.Pending:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
      case ProcedureStatus.Completed:
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      case ProcedureStatus.Overdue:
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      case ProcedureStatus.Cancelled:
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Trámites</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Cumple con los trámites requeridos por administración.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes / vencidos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completados</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {procedures.filter(p => p.status === ProcedureStatus.Completed).length}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-blue-600" />
          Bandeja de trámites
        </h2>

        {loading ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
          </div>
        ) : procedures.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No tienes trámites asignados por el momento.</p>
        ) : (
          <div className="space-y-3">
            {procedures.map((procedure) => (
              <div key={procedure.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{procedure.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tipo: {procedure.typeName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {procedure.isMandatory && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Obligatorio</span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(procedure.status)}`}>
                      {procedureStatusNames[procedure.status]}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{procedure.description}</p>
                {procedure.requirements && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Requisitos: {procedure.requirements}</p>
                )}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                    <CalendarClock className="w-4 h-4" />
                    Vence: {new Date(procedure.dueDate).toLocaleString('es-MX')}
                  </p>

                  {(procedure.status === ProcedureStatus.Pending || procedure.status === ProcedureStatus.Overdue) && (
                    <button
                      onClick={() => completeProcedure(procedure)}
                      disabled={completingId === procedure.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 disabled:opacity-60"
                    >
                      {completingId === procedure.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Marcar completado
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
