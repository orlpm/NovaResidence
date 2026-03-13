import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, ClipboardCheck, Loader2, PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { residentService, type ResidentWithUnitDto } from '../../lib/residentService'
import {
  ProcedureStatus,
  ProcedureType,
  procedureService,
  procedureStatusNames,
  procedureTypeNames,
  type ProcedureDto,
  type ProcedureTemplateDto
} from '../../lib/procedureService'
import { useAuthStore } from '../../stores/authStore'

function toLocalInputValue(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return adjusted.toISOString().slice(0, 16)
}

export default function AdminProcedures() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominiumId, setSelectedCondominiumId] = useState('')
  const [residents, setResidents] = useState<ResidentWithUnitDto[]>([])
  const [procedures, setProcedures] = useState<ProcedureDto[]>([])
  const [templates, setTemplates] = useState<ProcedureTemplateDto[]>([])

  const [formData, setFormData] = useState({
    residentId: '',
    procedureTemplateId: '',
    type: ProcedureType.Electricity,
    title: '',
    description: '',
    requirements: '',
    dueDate: toLocalInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    isMandatory: true
  })

  useEffect(() => {
    const loadCondominiums = async () => {
      if (!user?.id) return
      try {
        const data = await condominiumService.getAllCondominiums(user.id)
        setCondominiums(data)
        if (data.length > 0) {
          setSelectedCondominiumId(data[0].id)
        }
      } catch {
        setError('No se pudieron cargar los condominios')
      }
    }

    loadCondominiums()
  }, [user?.id])

  useEffect(() => {
    const loadData = async () => {
      if (!selectedCondominiumId) return
      setLoading(true)
      setError(null)
      try {
        const [residentData, procedureData] = await Promise.all([
          residentService.getResidentsByCondominium(selectedCondominiumId),
          procedureService.getByCondominium(selectedCondominiumId)
        ])
        const templateData = await procedureService.getTemplates(selectedCondominiumId)
        setResidents(residentData.filter(r => r.isActive))
        setProcedures(procedureData)
        setTemplates(templateData)
      } catch {
        setError('No se pudo cargar la información de trámites')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedCondominiumId])

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

  const pendingCount = useMemo(
    () => procedures.filter(p => p.status === ProcedureStatus.Pending || p.status === ProcedureStatus.Overdue).length,
    [procedures]
  )

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedCondominiumId) {
      toast.error('Selecciona un condominio')
      return
    }

    if (!formData.residentId) {
      toast.error('Selecciona un residente')
      return
    }

    setSubmitting(true)
    try {
      await procedureService.create({
        condominiumId: selectedCondominiumId,
        residentId: formData.residentId,
        procedureTemplateId: formData.procedureTemplateId || undefined,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim(),
        requirements: formData.requirements.trim(),
        dueDate: new Date(formData.dueDate).toISOString(),
        isMandatory: formData.isMandatory
      })

      toast.success('Trámite asignado exitosamente')
      setFormData(prev => ({
        ...prev,
        residentId: '',
        procedureTemplateId: '',
        title: '',
        description: '',
        requirements: '',
        dueDate: toLocalInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        isMandatory: true
      }))

      const updatedProcedures = await procedureService.getByCondominium(selectedCondominiumId)
      setProcedures(updatedProcedures)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No fue posible asignar el trámite')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Trámites</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Asigna trámites obligatorios a residentes con fecha de vencimiento.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Condominios</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{condominiums.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Trámites pendientes/vencidos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condominio</label>
          <select
            value={selectedCondominiumId}
            onChange={(e) => setSelectedCondominiumId(e.target.value)}
            className="w-full md:w-96 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option value="">Selecciona condominio</option>
            {condominiums.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Residente</label>
            <select
              value={formData.residentId}
              onChange={(e) => setFormData(prev => ({ ...prev, residentId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              required
            >
              <option value="">Selecciona residente</option>
              {residents.map(r => (
                <option key={r.id} value={r.id}>{r.firstName} {r.lastName} · Unidad {r.unitNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plantilla jurisdiccional (opcional)</label>
            <select
              value={formData.procedureTemplateId}
              onChange={(e) => {
                const selectedId = e.target.value
                const template = templates.find(t => t.id === selectedId)
                setFormData(prev => ({
                  ...prev,
                  procedureTemplateId: selectedId,
                  type: template ? template.type : prev.type,
                  title: template ? template.name : prev.title,
                  description: template ? template.description : prev.description,
                  requirements: template ? template.requirements : prev.requirements,
                  isMandatory: template ? template.isMandatoryDefault : prev.isMandatory
                }))
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <option value="">Sin plantilla</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} · {t.authorityName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de trámite</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: Number(e.target.value) as ProcedureType }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              {Object.entries(procedureTypeNames).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
            <input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              placeholder="Ej. Actualizar contrato de luz"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha límite</label>
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              required
            />
          </div>

          <div className="flex items-center gap-2 mt-6">
            <input
              id="mandatory"
              type="checkbox"
              checked={formData.isMandatory}
              onChange={(e) => setFormData(prev => ({ ...prev, isMandatory: e.target.checked }))}
              className="rounded"
            />
            <label htmlFor="mandatory" className="text-sm text-gray-700 dark:text-gray-300">Trámite obligatorio</label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Requisitos</label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              rows={2}
              placeholder="Lista de documentos o pasos"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Asignar Trámite
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-blue-600" />
          Trámites asignados
        </h2>

        {loading ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400 flex justify-center items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando...
          </div>
        ) : procedures.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No hay trámites registrados para este condominio.</p>
        ) : (
          <div className="space-y-3">
            {procedures.map((procedure) => (
              <div key={procedure.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{procedure.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{procedure.residentName} · {procedure.typeName}</p>
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 inline-flex items-center gap-1">
                  <CalendarClock className="w-4 h-4" />
                  Vence: {new Date(procedure.dueDate).toLocaleString('es-MX')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
