import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { parkingService, type ParkingSpotDto, type VehicleDto } from '../../lib/operationsService'
import { residentService } from '../../lib/residentService'
import { useAuthStore } from '../../stores/authStore'

export default function ResidentVehicles() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<{ condominiumId: string; unitId: string } | null>(null)
  const [spots, setSpots] = useState<ParkingSpotDto[]>([])
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('')
  const [spotCode, setSpotCode] = useState('')

  const load = async (unitId: string, condominiumId: string) => {
    const [spotList, vehicleList] = await Promise.all([
      parkingService.getSpots(condominiumId),
      parkingService.getUnitVehicles(unitId)
    ])
    setSpots(spotList)
    setVehicles(vehicleList)
    setSpotCode(current => current || spotList[0]?.code || '')
  }

  useEffect(() => {
    const start = async () => {
      if (!user?.id) return
      const resident = await residentService.getResidentInfo(user.id)
      if (!resident?.condominiumId || !resident.unitId) return
      setProfile({ condominiumId: resident.condominiumId, unitId: resident.unitId })
      await load(resident.unitId, resident.condominiumId)
    }
    start().catch(() => toast.error('No se pudieron cargar los vehículos'))
  }, [user?.id])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile) return
    try {
      await parkingService.createVehicle({ ...profile, plate, brand, spotCode })
      toast.success('Vehículo registrado')
      setPlate('')
      setBrand('')
      await load(profile.unitId, profile.condominiumId)
    } catch {
      toast.error('No se pudo registrar el vehículo')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis vehículos</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Registra la placa y el cajón asignado.</p>
      </div>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl border p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={plate} onChange={event => setPlate(event.target.value)} placeholder="Placa" required />
        <input className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={brand} onChange={event => setBrand(event.target.value)} placeholder="Marca" required />
        <select className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700" value={spotCode} onChange={event => setSpotCode(event.target.value)}>
          <option value="">Sin cajón</option>
          {spots.map(item => <option key={item.id} value={item.code}>{item.code}</option>)}
        </select>
        <button className="px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold">Registrar vehículo</button>
      </form>
      {vehicles.map(item => (
        <p key={item.id} className="text-gray-800 dark:text-gray-100">{item.plate} · {item.brand}{item.spotCode ? ` · Cajón ${item.spotCode}` : ''}</p>
      ))}
    </div>
  )
}
