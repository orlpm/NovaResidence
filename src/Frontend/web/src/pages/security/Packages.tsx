import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { packageService, type PackageDto } from '../../lib/operationsService'
import { useAuthStore } from '../../stores/authStore'

export default function SecurityPackages() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [condominiumId, setCondominiumId] = useState('')
  const [units, setUnits] = useState<{ id: string; label: string }[]>([])
  const [unitId, setUnitId] = useState('')
  const [carrier, setCarrier] = useState('')
  const [description, setDescription] = useState('')
  const [packages, setPackages] = useState<PackageDto[]>([])

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
    packageService.getByCondominium(condominiumId).then(setPackages).catch(() => toast.error('No se pudo cargar la paquetería'))
  }, [condominiumId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await packageService.create({ condominiumId, unitId, carrier, description })
      toast.success('Paquete registrado')
      setCarrier('')
      setDescription('')
      setPackages(await packageService.getByCondominium(condominiumId))
    } catch {
      toast.error('No se pudo registrar el paquete')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paquetería</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Registra la correspondencia y avisa al residente.</p>
      </div>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <select className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={condominiumId} onChange={event => setCondominiumId(event.target.value)}>
          {condominiums.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={unitId} onChange={event => setUnitId(event.target.value)} required>
          {units.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <input className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={carrier} onChange={event => setCarrier(event.target.value)} placeholder="Paquetería" required />
        <input className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={description} onChange={event => setDescription(event.target.value)} placeholder="Descripción del paquete" required />
        <button className="px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold">Registrar paquete</button>
      </form>
      <div className="space-y-3">
        {packages.map(item => (
          <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border p-4">
            <p className="font-semibold text-gray-900 dark:text-white">{item.carrier}</p>
            <p className="text-sm text-gray-500">{item.unitNumber} · {item.description} · {item.statusName}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
