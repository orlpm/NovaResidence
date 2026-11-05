import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { parkingService, type ParkingSpotDto, type VehicleDto } from '../../lib/operationsService'
import { residentService, type ResidentWithUnitDto } from '../../lib/residentService'
import { useAuthStore } from '../../stores/authStore'

export default function Parking() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [condominiumId, setCondominiumId] = useState('')
  const [code, setCode] = useState('')
  const [spots, setSpots] = useState<ParkingSpotDto[]>([])
  const [vehicles, setVehicles] = useState<VehicleDto[]>([])
  const [residents, setResidents] = useState<ResidentWithUnitDto[]>([])

  const load = async (id: string) => {
    const [spotList, vehicleList, residentList] = await Promise.all([
      parkingService.getSpots(id),
      parkingService.getVehicles(id),
      residentService.getResidentsByCondominium(id)
    ])
    setSpots(spotList)
    setVehicles(vehicleList)
    setResidents(residentList.filter(item => item.isActive))
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

  const assign = async (spotId: string, residentId: string) => {
    try {
      await parkingService.assignSpot(spotId, residentId || null)
      toast.success(residentId ? 'Cajón asignado' : 'Cajón liberado')
      await load(condominiumId)
    } catch {
      toast.error('No se pudo actualizar el cajón')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vehículos y cajones</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Asigna cada cajón a un residente y revisa las placas ligadas a sus visitas.</p>
      </div>
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-3">
        <select className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={condominiumId} onChange={event => setCondominiumId(event.target.value)}>
          {condominiums.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={code} onChange={event => setCode(event.target.value)} placeholder="Código del cajón" required />
        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold">Registrar cajón</button>
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Cajón</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium">Residente</th>
              <th className="px-4 py-3 font-medium">Placa</th>
              <th className="px-4 py-3 font-medium">Asignar</th>
            </tr>
          </thead>
          <tbody>
            {spots.map(item => (
              <tr key={item.id} className="border-t border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                <td className="px-4 py-3 font-semibold">{item.code}</td>
                <td className="px-4 py-3">{item.unitNumber || '—'}</td>
                <td className="px-4 py-3">{item.residentName || 'Libre'}</td>
                <td className="px-4 py-3">{item.assignedPlate || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                    value={item.residentId || ''}
                    onChange={event => assign(item.id, event.target.value)}
                  >
                    <option value="">Liberar</option>
                    {residents.map(resident => (
                      <option key={resident.id} value={resident.id}>
                        {resident.firstName} {resident.lastName} · {resident.unitNumber}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {spots.length === 0 && (
              <tr><td className="px-4 py-6 text-gray-500" colSpan={5}>No hay cajones registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Placa</th>
              <th className="px-4 py-3 font-medium">Vehículo</th>
              <th className="px-4 py-3 font-medium">Residente</th>
              <th className="px-4 py-3 font-medium">Unidad</th>
              <th className="px-4 py-3 font-medium">Cajón</th>
              <th className="px-4 py-3 font-medium">Visitas</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(item => (
              <tr key={item.id} className="border-t border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                <td className="px-4 py-3 font-semibold">{item.plate}</td>
                <td className="px-4 py-3">{[item.brand, item.color].filter(Boolean).join(' ')}</td>
                <td className="px-4 py-3">{item.residentName || '—'}</td>
                <td className="px-4 py-3">{item.unitNumber || '—'}</td>
                <td className="px-4 py-3">{item.spotCode || '—'}</td>
                <td className="px-4 py-3">{item.relatedVisits}</td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr><td className="px-4 py-6 text-gray-500" colSpan={6}>No hay vehículos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
