import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { fineService } from '../../lib/operationsService'
import { useAuthStore } from '../../stores/authStore'

export default function Fines() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [condominiumId, setCondominiumId] = useState('')
  const [units, setUnits] = useState<{ id: string; label: string }[]>([])
  const [unitId, setUnitId] = useState('')
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('350')

  useEffect(() => {
    condominiumService.getAllCondominiums(user?.id).then(data => {
      setCondominiums(data)
      if (data[0]) setCondominiumId(data[0].id)
    }).catch(() => toast.error('No se pudieron cargar los condominios'))
  }, [user?.id])

  useEffect(() => {
    if (!condominiumId) return
    condominiumService.getCondominiumById(condominiumId).then(detail => {
      const options = (detail.buildings || []).flatMap(building =>
        (building.units || []).map(unit => ({ id: unit.id, label: `${building.name} ${unit.unitNumber}` }))
      )
      setUnits(options)
      setUnitId(options[0]?.id || '')
    }).catch(() => toast.error('No se pudieron cargar las unidades'))
  }, [condominiumId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await fineService.create({ condominiumId, unitId, concept, amount: Number(amount) })
      toast.success('Multa registrada')
      setConcept('')
    } catch {
      toast.error('No se pudo registrar la multa')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Multas</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">La multa se refleja en el estado de cuenta del residente.</p>
      </div>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl border p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <select className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={condominiumId} onChange={event => setCondominiumId(event.target.value)}>
          {condominiums.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={unitId} onChange={event => setUnitId(event.target.value)} required>
          {units.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <input className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={concept} onChange={event => setConcept(event.target.value)} placeholder="Motivo de la multa" required />
        <input type="number" min="1" step="0.01" className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={amount} onChange={event => setAmount(event.target.value)} required />
        <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold">Registrar multa</button>
      </form>
    </div>
  )
}
