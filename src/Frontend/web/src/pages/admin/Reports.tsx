import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Download, 
  Calendar,
  DollarSign,
  Users,
  Home,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Filter,
  RefreshCw,
  Building2
} from 'lucide-react'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { useAuthStore } from '../../stores/authStore'

type ReportType = 'financial' | 'operational' | 'residents' | 'incidents'

interface FinancialSummary {
  totalIncome: number
  totalExpenses: number
  pendingCharges: number
  collectedAmount: number
  collectionRate: number
}

interface OperationalSummary {
  totalUnits: number
  occupiedUnits: number
  occupancyRate: number
  totalReservations: number
  activeAmenities: number
}

interface ResidentSummary {
  totalResidents: number
  owners: number
  tenants: number
  pendingInvitations: number
  activeUsers: number
}

interface IncidentSummary {
  totalIncidents: number
  openIncidents: number
  inProgressIncidents: number
  resolvedIncidents: number
  avgResolutionTime: number
}

export default function Reports() {
  const { user } = useAuthStore()
  const [activeReport, setActiveReport] = useState<ReportType>('financial')
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  // Mock data for reports
  const [financialData] = useState<FinancialSummary>({
    totalIncome: 125000,
    totalExpenses: 45000,
    pendingCharges: 32500,
    collectedAmount: 92500,
    collectionRate: 74
  })

  const [operationalData] = useState<OperationalSummary>({
    totalUnits: 48,
    occupiedUnits: 42,
    occupancyRate: 87.5,
    totalReservations: 156,
    activeAmenities: 8
  })

  const [residentData] = useState<ResidentSummary>({
    totalResidents: 126,
    owners: 42,
    tenants: 84,
    pendingInvitations: 6,
    activeUsers: 98
  })

  const [incidentData] = useState<IncidentSummary>({
    totalIncidents: 45,
    openIncidents: 8,
    inProgressIncidents: 12,
    resolvedIncidents: 25,
    avgResolutionTime: 2.5
  })

  useEffect(() => {
    loadCondominiums()
  }, [])

  useEffect(() => {
    if (selectedCondominium) {
      loadReportData()
    }
  }, [selectedCondominium, dateRange, activeReport])

  const loadCondominiums = async () => {
    try {
      const data = await condominiumService.getAllCondominiums(user?.id)
      setCondominiums(data)
      if (data.length > 0) {
        setSelectedCondominium(data[0].id)
      }
    } catch (error) {
      console.error('Error loading condominiums:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadReportData = async () => {
    setIsLoading(true)
    // In a real implementation, this would call the API
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  const exportReport = (format: 'pdf' | 'excel') => {
    alert(`Exportando reporte en formato ${format.toUpperCase()}...`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const reportTabs = [
    { id: 'financial', label: 'Financiero', icon: DollarSign },
    { id: 'operational', label: 'Operacional', icon: BarChart3 },
    { id: 'residents', label: 'Residentes', icon: Users },
    { id: 'incidents', label: 'Incidencias', icon: AlertCircle }
  ]

  const renderFinancialReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">+12%</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos Totales</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(financialData.totalIncome)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <DollarSign className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm text-red-600 dark:text-red-400 font-medium">-5%</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gastos Totales</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(financialData.totalExpenses)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargos Pendientes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(financialData.pendingCharges)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
            <span className="text-sm text-sky-600 dark:text-sky-400 font-medium">{financialData.collectionRate}%</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tasa de Cobranza</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(financialData.collectedAmount)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ingresos vs Gastos</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Gráfico de barras</p>
              <p className="text-sm">Próximamente con datos reales</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribución de Gastos</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Gráfico circular</p>
              <p className="text-sm">Próximamente con datos reales</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Últimos Movimientos</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Concepto</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Unidad</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Monto</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: '01/02/2026', concept: 'Cuota de mantenimiento', unit: '101', amount: 2500, status: 'paid' },
                { date: '01/02/2026', concept: 'Cuota de mantenimiento', unit: '205', amount: 2500, status: 'pending' },
                { date: '31/01/2026', concept: 'Reservación Salón', unit: '302', amount: 500, status: 'paid' },
                { date: '30/01/2026', concept: 'Cuota extraordinaria', unit: '401', amount: 1000, status: 'overdue' },
                { date: '29/01/2026', concept: 'Cuota de mantenimiento', unit: '103', amount: 2500, status: 'paid' },
              ].map((item, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{item.date}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{item.concept}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{item.unit}</td>
                  <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.amount)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      item.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {item.status === 'paid' ? 'Pagado' : item.status === 'pending' ? 'Pendiente' : 'Vencido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderOperationalReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <Home className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Unidades</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{operationalData.totalUnits}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">{operationalData.occupancyRate}%</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Ocupación</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{operationalData.occupiedUnits}/{operationalData.totalUnits}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Reservaciones</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{operationalData.totalReservations}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Amenidades Activas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{operationalData.activeAmenities}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tendencia de Ocupación</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Gráfico de líneas</p>
            <p className="text-sm">Próximamente con datos reales</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderResidentsReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <Users className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Residentes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{residentData.totalResidents}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Home className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Propietarios</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{residentData.owners}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Inquilinos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{residentData.tenants}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Invitaciones Pendientes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{residentData.pendingInvitations}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Distribución por Tipo</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Gráfico circular</p>
              <p className="text-sm">Propietarios vs Inquilinos</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actividad de Usuarios</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Usuarios Activos</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">{residentData.activeUsers}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${(residentData.activeUsers / residentData.totalResidents) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round((residentData.activeUsers / residentData.totalResidents) * 100)}% de usuarios activos en los últimos 30 días
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderIncidentsReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <AlertCircle className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Incidencias</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{incidentData.totalIncidents}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Abiertas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{incidentData.openIncidents}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">En Progreso</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{incidentData.inProgressIncidents}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Resueltas</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{incidentData.resolvedIncidents}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estado de Incidencias</h3>
          <div className="space-y-4">
            {[
              { label: 'Abiertas', value: incidentData.openIncidents, color: 'red', percentage: (incidentData.openIncidents / incidentData.totalIncidents) * 100 },
              { label: 'En Progreso', value: incidentData.inProgressIncidents, color: 'yellow', percentage: (incidentData.inProgressIncidents / incidentData.totalIncidents) * 100 },
              { label: 'Resueltas', value: incidentData.resolvedIncidents, color: 'green', percentage: (incidentData.resolvedIncidents / incidentData.totalIncidents) * 100 }
            ].map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      item.color === 'red' ? 'bg-red-500' :
                      item.color === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tiempo de Resolución</h3>
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <p className="text-5xl font-bold text-sky-600 dark:text-sky-400">{incidentData.avgResolutionTime}</p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">días promedio</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Incidencias Recientes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Título</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Prioridad</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'INC-045', title: 'Luz fundida en pasillo', type: 'Mantenimiento', priority: 'Media', status: 'open' },
                { id: 'INC-044', title: 'Fuga de agua en baño', type: 'Plomería', priority: 'Alta', status: 'in_progress' },
                { id: 'INC-043', title: 'Ruido excesivo', type: 'Convivencia', priority: 'Baja', status: 'resolved' },
                { id: 'INC-042', title: 'Elevador fuera de servicio', type: 'Mantenimiento', priority: 'Urgente', status: 'in_progress' },
                { id: 'INC-041', title: 'Vidrio roto en entrada', type: 'Seguridad', priority: 'Alta', status: 'resolved' },
              ].map((item, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-3 px-4 text-sm font-medium text-sky-600 dark:text-sky-400">{item.id}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{item.title}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{item.type}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.priority === 'Urgente' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      item.priority === 'Alta' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      item.priority === 'Media' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'open' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      item.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {item.status === 'open' ? 'Abierta' : item.status === 'in_progress' ? 'En Progreso' : 'Resuelta'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-sky-500" />
            Reportes y Análisis
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Visualiza métricas y estadísticas de tu condominio</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadReportData()}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button 
            onClick={() => exportReport('pdf')}
            className="flex items-center gap-2 px-4 py-2 text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
          <button 
            onClick={() => exportReport('excel')}
            className="flex items-center gap-2 px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condominio</label>
          <select
            value={selectedCondominium}
            onChange={(e) => setSelectedCondominium(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Selecciona un condominio</option>
            {condominiums.map((condo) => (
              <option key={condo.id} value={condo.id}>{condo.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id as ReportType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeReport === tab.id
                ? 'bg-sky-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Cargando datos...</p>
          </div>
        </div>
      ) : !selectedCondominium ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Selecciona un condominio</h3>
          <p className="text-gray-500 dark:text-gray-400">Para ver los reportes, primero selecciona un condominio del filtro superior.</p>
        </div>
      ) : (
        <>
          {activeReport === 'financial' && renderFinancialReport()}
          {activeReport === 'operational' && renderOperationalReport()}
          {activeReport === 'residents' && renderResidentsReport()}
          {activeReport === 'incidents' && renderIncidentsReport()}
        </>
      )}
    </div>
  )
}
