import { useState, useEffect } from 'react'
import { HomeIcon, MapPinIcon, CurrencyDollarIcon, UserGroupIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface Unit {
  id: string
  unitNumber: string
  floor: number
  area: number
  bedrooms: number
  bathrooms: number
  status: string
  monthlyMaintenanceFee: number
  building: {
    name: string
  }
}

function MyUnit() {
  const [unit, setUnit] = useState<Unit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUnitInfo()
  }, [])

  const loadUnitInfo = async () => {
    try {
      // TODO: Implementar endpoint para obtener la unidad del residente actual
      // const data = await apiClient.get('/residents/my-unit')
      // setUnit(data)
      
      // Datos de ejemplo mientras se implementa el endpoint
      setUnit({
        id: '1',
        unitNumber: '101',
        floor: 1,
        area: 85.5,
        bedrooms: 2,
        bathrooms: 2,
        status: 'Ocupada',
        monthlyMaintenanceFee: 2500,
        building: {
          name: 'Torre A'
        }
      })
    } catch (error) {
      console.error('Error loading unit:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!unit) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
        <p className="text-yellow-800 dark:text-yellow-200">No se encontró información de tu unidad.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Mi Unidad</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Información de tu unidad y pagos</p>
      </div>

      {/* Información General */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <HomeIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                Unidad {unit.unitNumber}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{unit.building.name}</p>
            </div>
          </div>
          <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-semibold">
            {unit.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Piso */}
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <MapPinIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Piso</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{unit.floor}</p>
          </div>

          {/* Área */}
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <HomeIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Área</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{unit.area} m²</p>
          </div>

          {/* Recámaras */}
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <UserGroupIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Recámaras</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{unit.bedrooms}</p>
          </div>

          {/* Baños */}
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <HomeIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Baños</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{unit.bathrooms}</p>
          </div>
        </div>
      </div>

      {/* Cuota de Mantenimiento */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">Cuota de Mantenimiento</h3>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-semibold">Cuota mensual</p>
          <p className="text-4xl font-black text-green-600 dark:text-green-400">
            ${unit.monthlyMaintenanceFee.toLocaleString('es-MX')} MXN
          </p>
        </div>
      </div>

      {/* Próximos Pagos */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <CalendarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">Próximos Pagos</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:shadow-md transition-shadow">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Mantenimiento - Febrero 2026</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vence: 05 Feb 2026</p>
            </div>
            <span className="text-xl font-black text-gray-900 dark:text-white">
              ${unit.monthlyMaintenanceFee.toLocaleString('es-MX')}
            </span>
          </div>

          <div className="text-center py-4">
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors">
              Ver todos los pagos →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyUnit
