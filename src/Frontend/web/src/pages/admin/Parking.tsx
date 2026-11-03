import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { parkingService, type ParkingSpotDto, type VehicleDto } from '../../lib/operationsService'
import { useAuthStore } from '../../stores/authStore'

export default function Parking() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [condominiumId, setCondominiumId] = useState('')
  const [code, setCode] = useState('')
  const [spots, setSpots] = useState<ParkingSpotDto[]>([])
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])

  const load = async (id: string) => {
    const [spotList, vehicleList] = await Promise.all([
      parkingService.getSpots(id),
      parkingService.getVehicles(id)
    ])
    setSpots(spotList)
    setVehicles(vehicleList)
  }

  useEffect(() => {
    condominiumService.getAllCondominiums(user?.id).then(data => {
      setCondominiums(data)
      if (data[0]) setCondominiumId(data[0].id)
    }).catch(() => toast.error('No se pudieron cargar los condominios'))
  }, [user?.id])

  useEffect(() => {
    if (condominiumId) load(condominiumId).catch(() => toast.error('No se pudo cargar el estacionamiento'))
  }, [condominiumId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await parkingService.createSpot(condominiumId, code)
      toast.success('Cajón registrado')
      setCode('')
      await load(condominiumId)
    } catch {
      toast.error('No se pudo registrar el cajón')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vehículos y cajones</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Cajones del condominio y placas de los residentes.</p>
      </div>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl border p-4 flex flex-col md:flex-row gap-3">
        <select className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={condominiumId} onChange={event => setCondominiumId(event.target.value)}>
          {condominiums.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={code} onChange={event => setCode(event.target.value)} placeholder="Código del cajón" required />
        <button className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold">Registrar cajón</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h2 className="font-semibold text-gray-900 dark:text-white">Cajones</h2>
          {spots.map(item => <p key={item.id} className="text-sm text-gray-700 dark:text-gray-200">{item.code}{item.assignedPlate ? ` · ${item.assignedPlate}` : ''}</p>)}
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold text-gray-900 dark:text-white">Vehículos</h2>
          {vehicles.map(item => <p key={item.id} className="text-sm text-gray-700 dark:text-gray-200">{item.plate} · {item.brand}{item.spotCode ? ` · ${item.spotCode}` : ''}</p>)}
        </div>
      </div>
    </div>
  )
}
