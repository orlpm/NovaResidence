import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { parkingService, type ParkingSpotDto, type VehicleDto } from '../../lib/operationsService'
import { residentService } from '../../lib/residentService'
import { visitService, type VisitListDto } from '../../lib/visitService'
import { useAuthStore } from '../../stores/authStore'

interface ResidentProfile {
  id: string
  condominiumId: string
  unitId: string
}

export default function ResidentVehicles() {
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<ResidentProfile | null>(null)
  const [spots, setSpots] = useState<ParkingSpotDto[]>([])
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [visits, setVisits] = useState<VisitListDto[]>([])
  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('')
  const [color, setColor] = useState('')
  const [spotCode, setSpotCode] = useState('')

  const load = async (unitId: string, condominiumId: string, residentId: string) => {
    const [spotList, vehicleList, visitList] = await Promise.all([
      parkingService.getSpots(condominiumId),
      parkingService.getUnitVehicles(unitId),
      visitService.getByUnit(unitId)
    ])
    setSpots(spotList.filter(item => !item.residentId || item.residentId === residentId))
    setVehicles(vehicleList)
    setVisits(visitList)
  }

  useEffect(() => {
    const start = async () => {
      if (!user?.id) return
      const resident = await residentService.getResidentInfo(user.id)
      if (!resident?.condominiumId || !resident.unitId) return
      const next = { id: resident.id, condominiumId: resident.condominiumId, unitId: resident.unitId }
      setProfile(next)
      await load(next.unitId, next.condominiumId, next.id)
    }
    start().catch(() => toast.error('No se pudieron cargar los vehículos'))
  }, [user?.id])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile) return
    try {
      await parkingService.createVehicle({
        ...profile,
        residentId: profile.id,
        plate,
        brand,
        color,
        spotCode: spotCode || undefined
      })
      toast.success('Vehículo registrado')
      setPlate('')
      setBrand('')
      setColor('')
      await load(profile.unitId, profile.condominiumId, profile.id)
    } catch {
      toast.error('No se pudo registrar el vehículo')
    }
  }

  const visitsFor = (vehiclePlate: string) =>
    visits.filter(item => item.vehiclePlate?.trim().toUpperCase() === vehiclePlate.trim().toUpperCase())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Mis vehículos</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">La placa queda ligada a tu unidad y se puede usar al registrar una visita.</p>
      </div>
      <form onSubmit={submit} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700" value={plate} onChange={event => setPlate(event.target.value)} placeholder="Placa" required />
        <input className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700" value={brand} onChange={event => setBrand(event.target.value)} placeholder="Marca" required />
        <input className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700" value={color} onChange={event => setColor(event.target.value)} placeholder="Color" />
        <select className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700" value={spotCode} onChange={event => setSpotCode(event.target.value)}>
          <option value="">Sin cajón</option>
          {spots.map(item => <option key={item.id} value={item.code}>{item.code}{item.assignedPlate ? ` · ${item.assignedPlate}` : ''}</option>)}
        </select>
        <button className="md:col-span-2 px-4 py-2 rounded-lg bg-gradient-brand text-white font-semibold">Registrar vehículo</button>
      </form>
      {vehicles.map(item => {
        const related = visitsFor(item.plate)
        return (
          <div key={item.id} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <p className="font-semibold text-neutral-900 dark:text-white">{item.plate} · {item.brand}{item.color ? ` ${item.color}` : ''}</p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.spotCode ? `Cajón ${item.spotCode}` : 'Sin cajón'} · {related.length} visitas con esta placa</p>
            {related.slice(0, 3).map(visit => (
              <p key={visit.id} className="text-sm text-neutral-700 dark:text-neutral-300">{visit.visitorName} · {new Date(visit.expectedArrival).toLocaleString('es-MX')}</p>
            ))}
          </div>
        )
      })}
    </div>
  )
}
