import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { packageService, type PackageDto } from '../../lib/operationsService'
import { residentService } from '../../lib/residentService'
import { useAuthStore } from '../../stores/authStore'

export default function ResidentPackages() {
  const { user } = useAuthStore()
  const [packages, setPackages] = useState<PackageDto[]>([])

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      try {
        const resident = await residentService.getResidentInfo(user.id)
        if (!resident?.unitId) return
        setPackages(await packageService.getByUnit(resident.unitId))
      } catch {
        toast.error('No se pudo cargar la paquetería')
      }
    }
    load()
  }, [user?.id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paquetería</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Correspondencia recibida en caseta.</p>
      </div>
      {packages.length === 0 ? <p className="text-gray-500">No hay paquetes pendientes.</p> : packages.map(item => (
        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="font-semibold text-gray-900 dark:text-white">{item.carrier}</p>
          <p className="text-sm text-gray-500">{item.description} · {item.statusName}</p>
        </div>
      ))}
    </div>
  )
}
