import { useEffect, useMemo, useState } from 'react'
import { Calculator, DollarSign, TrendingUp, FileText, Loader2, AlertCircle } from 'lucide-react'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { billingService, type BillingSummaryDto, type PaymentDto } from '../../lib/billingService'
import { reportService, type FinancialReportDto } from '../../lib/reportService'
import { useAuthStore } from '../../stores/authStore'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const percentage = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })

export default function AccountantDashboard() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState('')
  const [summary, setSummary] = useState<BillingSummaryDto | null>(null)
  const [financial, setFinancial] = useState<FinancialReportDto | null>(null)
  const [pendingPayments, setPendingPayments] = useState<PaymentDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCondominiums = async () => {
      try {
        const data = await condominiumService.getAllCondominiums(user?.id)
        setCondominiums(data)
        if (data.length > 0) {
          setSelectedCondominium(data[0].id)
        }
      } catch {
        setError('No se pudieron cargar los condominios')
      }
    }

    loadCondominiums()
  }, [user?.id])

  useEffect(() => {
    const loadFinancialData = async () => {
      if (!selectedCondominium) return
      setLoading(true)
      setError(null)

      try {
        const now = new Date()
        const month = now.getMonth() + 1
        const year = now.getFullYear()
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)

        const [summaryData, financialData, pendingData] = await Promise.all([
          billingService.getBillingSummary(selectedCondominium, month, year),
          reportService.getFinancialReport(selectedCondominium, startDate, endDate),
          billingService.getPendingPayments(selectedCondominium)
        ])

        setSummary(summaryData)
        setFinancial(financialData)
        setPendingPayments(pendingData)
      } catch {
        setError('No se pudieron cargar los KPIs financieros')
      } finally {
        setLoading(false)
      }
    }

    loadFinancialData()
  }, [selectedCondominium])

  const netBalance = useMemo(() => {
    if (!summary) return 0
    return summary.totalCollected - summary.totalPending
  }, [summary])

  const stats = [
    {
      name: 'Ingresos del Mes',
      value: currency.format(summary?.totalCollected ?? 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      change: `${percentage.format(summary?.collectionRate ?? 0)}%`
    },
    {
      name: 'Pendientes de Cobro',
      value: currency.format(summary?.totalPending ?? 0),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      change: `${pendingPayments.length} pagos`
    },
    {
      name: 'Cargos Generados',
      value: String(financial?.totalCharges ?? 0),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      change: `${financial?.paidCharges ?? 0} pagados`
    },
    {
      name: 'Tasa de Cobro',
      value: `${percentage.format(summary?.collectionRate ?? 0)}%`,
      icon: Calculator,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
      change: `${financial?.overdueCharges ?? 0} vencidos`
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Contabilidad</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">KPIs financieros alimentados por backend en tiempo real.</p>
        </div>

        <div className="w-full md:w-80">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condominio</label>
          <select
            value={selectedCondominium}
            onChange={(e) => setSelectedCondominium(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            {condominiums.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 p-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Cargando datos financieros...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{stat.change}</span>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.name}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resumen Mensual</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total Facturado</span>
                  <span className="font-bold text-gray-900 dark:text-white">{currency.format(summary?.totalCharged ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Cobrado</span>
                  <span className="font-bold text-green-600">{currency.format(summary?.totalCollected ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Pendiente</span>
                  <span className="font-bold text-orange-600">{currency.format(summary?.totalPending ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Vencido</span>
                  <span className="font-bold text-red-600">{currency.format(summary?.totalOverdue ?? 0)}</span>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900 dark:text-white">Balance Neto</span>
                    <span className={`font-bold text-2xl ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {currency.format(netBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pagos Pendientes por Verificar</h2>
              {pendingPayments.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No hay pagos pendientes de verificación.</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {pendingPayments.slice(0, 8).map((payment) => (
                    <div key={payment.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{payment.chargeConcept || 'Pago de cuota'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {payment.buildingName ? `${payment.buildingName} - ` : ''}{payment.unitNumber || 'Sin unidad'}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-orange-600">{currency.format(payment.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
