import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { residentService } from '../../lib/residentService'
import { billingService } from '../../lib/billingService'
import { HomeIcon, MapPinIcon, CurrencyDollarIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

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

interface Balance {
  balance: number
  totalCharged: number
  totalPaid: number
  overdueAmount: number
}

function MyUnit() {
  const { user } = useAuthStore()
  const [unit, setUnit] = useState<Unit | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUnitInfo()
  }, [user?.id])

  const loadUnitInfo = async () => {
    if (!user?.id) return
    try {
      // Obtener información del residente (incluye unitId)
      const resident = await residentService.getResidentInfo(user.id)
      
      if (resident && resident.unitId) {
        // Obtener información de la unidad
        const unitData: Unit = {
          id: resident.unitId,
          unitNumber: resident.unitNumber || 'N/A',
          floor: parseInt(resident.unitNumber?.match(/\d+/)?.[0] || '1') || 1,
          area: 85.5,
          bedrooms: 2,
          bathrooms: 2,
          status: 'Ocupada',
          monthlyMaintenanceFee: 2500,
          building: {
            name: resident.buildingName || 'Torre Principal'
          }
        }
        setUnit(unitData)

        // Obtener balance
        try {
          const balanceData = await billingService.getUnitBalance(resident.unitId)
          setBalance({
            balance: balanceData.balance ?? (balanceData as any).Balance ?? 0,
            totalCharged: (balanceData as any).totalDue ?? (balanceData as any).TotalDue ?? balanceData.totalCharged ?? 0,
            totalPaid: balanceData.totalPaid ?? (balanceData as any).TotalPaid ?? 0,
            overdueAmount: (balanceData as any).overdueCharges > 0 ? balanceData.balance : 0
          })
        } catch (error) {
          console.warn('Error loading balance:', error)
        }
      }
    } catch (error) {
      console.error('Error loading unit:', error)
      toast.error('Error al cargar información de la unidad')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        </div>
      </div>
    )
  }

  if (!unit) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
          <p className="text-yellow-800 dark:text-yellow-200">No se encontró información de tu unidad.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Mi Unidad</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Información de tu unidad y pagos</p>
      </div>

      {/* Información General */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-xl">
              <HomeIcon className="h-8 w-8 text-sky-600 dark:text-sky-400" />
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
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <MapPinIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Piso</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{unit.floor}</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <HomeIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Área</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{unit.area} m²</p>
          </div>

          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <UserGroupIcon className="h-6 w-6 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Recámaras</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{unit.bedrooms}</p>
          </div>

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

      {/* Resumen de Pagos */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-2">Total Cargado</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">${balance.totalCharged.toFixed(2)}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-2">Total Pagado</p>
            <p className="text-3xl font-black text-green-600 dark:text-green-400">${balance.totalPaid.toFixed(2)}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-2">Saldo Pendiente</p>
            <p className={`text-3xl font-black ${balance.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              ${Math.abs(balance.balance).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Vencidos */}
      {balance && balance.overdueAmount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <span className="text-3xl">⚠️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 dark:text-red-300 mb-1">Pagos Vencidos</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mb-3">Tienes cargos vencidos que requieren atención inmediata.</p>
              <p className="text-2xl font-black text-red-600 dark:text-red-400">${balance.overdueAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyUnit

