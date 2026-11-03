import { useEffect, useState } from 'react'
import { Trees, Building2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { residentService } from '../../lib/residentService'
import { commonAreaService, type AreaReservationDto, type CommonAreaListDto } from '../../lib/commonAreaService'

export default function ResidentCommonAreas() {
  const { user } = useAuthStore()
  const [areas, setAreas] = useState<CommonAreaListDto[]>([])
  const [reservations, setReservations] = useState<AreaReservationDto[]>([])
  const [profile, setProfile] = useState<{ condominiumId: string; unitId: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedArea, setSelectedArea] = useState<CommonAreaListDto | null>(null)
  const [reservationDate, setReservationDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('12:00')
  const [purpose, setPurpose] = useState('')
  const [saving, setSaving] = useState(false)

  const loadAreas = async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const resident = await residentService.getResidentInfo(user.id)
      if (!resident?.condominiumId || !resident.unitId) {
        setAreas([])
        return
      }
      setProfile({ condominiumId: resident.condominiumId, unitId: resident.unitId })
      const [data, mine] = await Promise.all([
        commonAreaService.getByCondominium(resident.condominiumId, false),
        commonAreaService.getMyReservations(user.id)
      ])
      setAreas(data)
      setReservations(mine)
    } catch {
      toast.error('No se pudieron cargar las áreas comunes')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAreas()
  }, [user?.id])

  const submitReservation = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedArea || !profile) return
    setSaving(true)
    try {
      await commonAreaService.requestReservation({
        condominiumId: profile.condominiumId,
        commonAreaId: selectedArea.id,
        unitId: profile.unitId,
        reservationDate,
        startTime,
        endTime,
        purpose
      })
      toast.success('Reservación enviada')
      setSelectedArea(null)
      setPurpose('')
      if (user?.id) setReservations(await commonAreaService.getMyReservations(user.id))
    } catch {
      toast.error('No se pudo enviar la reservación')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Áreas Comunes</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Solicita el uso de los espacios del condominio.</p>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {areas.map(area => (
            <div key={area.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{area.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{area.typeName}</p>
                </div>
                <Trees className="w-5 h-5 text-green-500" />
              </div>

              {area.description && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{area.description}</p>}

              <div className="mt-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {area.level && <p>Nivel: {area.level}</p>}
                {(area.coordinateX !== null && area.coordinateX !== undefined && area.coordinateY !== null && area.coordinateY !== undefined) && (
                  <p className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {area.coordinateX}, {area.coordinateY}</p>
                )}
                {area.buildingId && <p className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> Edificio asociado</p>}
              </div>
              <button onClick={() => setSelectedArea(area)} className="mt-4 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-sm">Reservar</button>
              {reservations.filter(item => item.commonAreaId === area.id).map(item => (
                <p key={item.id} className="mt-2 text-sm text-gray-600 dark:text-gray-300">{item.statusName}</p>
              ))}
            </div>
          ))}

          {areas.length === 0 && (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-500">
              No hay áreas comunes activas en este momento
            </div>
          )}
        </div>
      )}

      {selectedArea && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={submitReservation} className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reservar área</h3>
            <p className="text-sm text-gray-500">{selectedArea.name}</p>
            <input type="date" required value={reservationDate} onChange={event => setReservationDate(event.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            <div className="grid grid-cols-2 gap-3">
              <input type="time" required value={startTime} onChange={event => setStartTime(event.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              <input type="time" required value={endTime} onChange={event => setEndTime(event.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            </div>
            <input value={purpose} onChange={event => setPurpose(event.target.value)} placeholder="Motivo de la reservación" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedArea(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">Cancelar</button>
              <button disabled={saving} className="px-4 py-2 rounded-lg bg-sky-600 text-white">Solicitar reservación</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
