import { useEffect, useState } from 'react'
import { Trees, Building2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { residentService } from '../../lib/residentService'
import { commonAreaService, type CommonAreaListDto } from '../../lib/commonAreaService'

export default function ResidentCommonAreas() {
  const { user } = useAuthStore()
  const [areas, setAreas] = useState<CommonAreaListDto[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAreas()
  }, [user?.id])

  const loadAreas = async () => {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const resident = await residentService.getResidentInfo(user.id)
      if (!resident?.condominiumId) {
        setAreas([])
        return
      }
      const data = await commonAreaService.getByCondominium(resident.condominiumId, false)
      setAreas(data)
    } catch {
      toast.error('No se pudieron cargar las áreas comunes')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Áreas Comunes</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Espacios de uso general del condominio (sin reservación)</p>
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
            </div>
          ))}

          {areas.length === 0 && (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-500">
              No hay áreas comunes activas en este momento
            </div>
          )}
        </div>
      )}
    </div>
  )
}
