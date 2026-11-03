import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { providerAppointmentService, type ProviderAppointmentDto, type ProviderOptionDto } from '../../lib/operationsService'
import { useAuthStore } from '../../stores/authStore'

export default function ProviderAgenda() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [condominiumId, setCondominiumId] = useState('')
  const [providers, setProviders] = useState<ProviderOptionDto[]>([])
  const [appointments, setAppointments] = useState<ProviderAppointmentDto[]>([])
  const [providerUserId, setProviderUserId] = useState('')
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    condominiumService.getAllCondominiums(user?.id).then(data => {
      setCondominiums(data)
      if (data[0]) setCondominiumId(data[0].id)
    }).catch(() => toast.error('No se pudieron cargar los condominios'))
  }, [user?.id])

  useEffect(() => {
    if (!condominiumId) return
    Promise.all([
      providerAppointmentService.getProviders(condominiumId),
      providerAppointmentService.getByCondominium(condominiumId)
    ]).then(([providerList, visits]) => {
      setProviders(providerList)
      setAppointments(visits)
      setProviderUserId(current => current || providerList[0]?.id || '')
    }).catch(() => toast.error('No se pudo cargar la agenda'))
  }, [condominiumId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!condominiumId || !providerUserId) return
    setSaving(true)
    try {
      await providerAppointmentService.create({
        condominiumId,
        providerUserId,
        title,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes
      })
      toast.success('Visita agendada')
      setTitle('')
      setNotes('')
      setAppointments(await providerAppointmentService.getByCondominium(condominiumId))
    } catch {
      toast.error('No se pudo agendar la visita')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda de proveedores</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Programa las visitas de los proveedores del condominio.</p>
      </div>

      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Condominio
          <select className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={condominiumId} onChange={event => setCondominiumId(event.target.value)}>
            {condominiums.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Proveedor
          <select className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={providerUserId} onChange={event => setProviderUserId(event.target.value)} required>
            <option value="">Selecciona un proveedor</option>
            {providers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Título
          <input className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={title} onChange={event => setTitle(event.target.value)} placeholder="Mantenimiento de elevadores" required />
        </label>
        <label className="text-sm text-gray-600 dark:text-gray-300">
          Fecha y hora
          <input type="datetime-local" className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} required />
        </label>
        <label className="md:col-span-2 text-sm text-gray-600 dark:text-gray-300">
          Notas
          <input className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Acceso por sótano" />
        </label>
        <div>
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold">Agendar visita</button>
        </div>
      </form>

      <div className="space-y-3">
        {appointments.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
            <p className="text-sm text-gray-500">{new Date(item.scheduledAt).toLocaleString()} · {item.statusName}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
