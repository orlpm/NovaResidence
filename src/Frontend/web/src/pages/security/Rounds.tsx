import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { securityRoundService, type SecurityRoundDto } from '../../lib/operationsService'
import { useAuthStore } from '../../stores/authStore'

export default function SecurityRounds() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [condominiumId, setCondominiumId] = useState('')
  const [area, setArea] = useState('')
  const [notes, setNotes] = useState('')
  const [rounds, setRounds] = useState<SecurityRoundDto[]>([])

  useEffect(() => {
    condominiumService.getAllCondominiums(user?.id).then(data => {
      setCondominiums(data)
      if (data[0]) setCondominiumId(data[0].id)
    }).catch(() => toast.error('No se pudieron cargar los condominios'))
  }, [user?.id])

  useEffect(() => {
    if (condominiumId) securityRoundService.getByCondominium(condominiumId).then(setRounds).catch(() => toast.error('No se pudieron cargar las rondas'))
  }, [condominiumId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await securityRoundService.create({ condominiumId, area, notes })
      toast.success('Ronda registrada')
      setArea('')
      setNotes('')
      setRounds(await securityRoundService.getByCondominium(condominiumId))
    } catch {
      toast.error('No se pudo registrar la ronda')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bitácora de rondas</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Recorridos de vigilancia, aparte del registro de visitas.</p>
      </div>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl border p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <select className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={condominiumId} onChange={event => setCondominiumId(event.target.value)}>
          {condominiums.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={area} onChange={event => setArea(event.target.value)} placeholder="Zona recorrida" required />
        <input className="md:col-span-2 px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={notes} onChange={event => setNotes(event.target.value)} placeholder="Notas de la ronda" required />
        <button className="px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold">Registrar ronda</button>
      </form>
      {rounds.map(item => (
        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="font-semibold text-gray-900 dark:text-white">{item.area}</p>
          <p className="text-sm text-gray-500">{item.notes}</p>
        </div>
      ))}
    </div>
  )
}
