import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  Users,
  Home,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Building2,
  Megaphone,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import {
  reportService,
  type FinancialReportDto,
  type OperationalReportDto,
  type ResidentReportDto,
  type IncidentReportDto,
  type CommunicationsReportDto
} from '../../lib/reportService'
import { useAuthStore } from '../../stores/authStore'

type ReportType = 'financial' | 'operational' | 'residents' | 'incidents' | 'communications'

// ========== Helpers ==========
const fmtMoney = (v: number) => '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (v: number) => v.toFixed(1) + '%'
const maxOf = (arr: number[]) => Math.max(...arr, 1)
const ALL_CONDOMINIUMS_VALUE = '__all__'

const aggregateBy = <T,>(items: T[], keySelector: (item: T) => string, merge: (current: T, incoming: T) => T): T[] => {
  const map = new Map<string, T>()
  for (const item of items) {
    const key = keySelector(item)
    const existing = map.get(key)
    map.set(key, existing ? merge(existing, item) : item)
  }
  return Array.from(map.values())
}

function ProgressBar({ value, max, color = 'bg-indigo-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800/40">
      <div
        className={`${color} h-2.5 rounded-full transition-[width] duration-300 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-indigo-600', bgColor = 'bg-indigo-50' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string; bgColor?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-5 flex items-start gap-4">
      <div className={`${bgColor} dark:bg-white/10 p-3 rounded-lg`}><Icon className={`w-6 h-6 ${color}`} /></div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{children}</h3>
}

// ========== CSV Export ==========
function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const { user } = useAuthStore()
  const [activeReport, setActiveReport] = useState<ReportType>('financial')
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const [dateRange, setDateRange] = useState({
    start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    end: now.toISOString().split('T')[0]
  })

  // Report data states
  const [financial, setFinancial] = useState<FinancialReportDto | null>(null)
  const [operational, setOperational] = useState<OperationalReportDto | null>(null)
  const [residents, setResidents] = useState<ResidentReportDto | null>(null)
  const [incidents, setIncidents] = useState<IncidentReportDto | null>(null)
  const [communications, setCommunications] = useState<CommunicationsReportDto | null>(null)

  // Load condominiums scoped by role hierarchy
  useEffect(() => {
    const loadCondominiums = async () => {
      try {
        const isSuperAdmin = user?.role === 'superadmin'
        const data = await condominiumService.getAllCondominiums(isSuperAdmin ? undefined : user?.id)
        setCondominiums(data)
        if (data.length > 0) {
          setSelectedCondominium(prev =>
            prev === ALL_CONDOMINIUMS_VALUE || (prev && data.some(c => c.id === prev))
              ? prev
              : data[0].id
          )
        } else {
          setSelectedCondominium('')
        }
      } catch {
        setCondominiums([])
        setSelectedCondominium('')
      }
    }

    loadCondominiums()
  }, [user?.id])

  // Load report data
  const loadReport = useCallback(async () => {
    if (!selectedCondominium) return
    setIsLoading(true)
    setError(null)
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    try {
      const targetCondominiumIds = selectedCondominium === ALL_CONDOMINIUMS_VALUE
        ? condominiums.map(c => c.id)
        : [selectedCondominium]

      if (targetCondominiumIds.length === 0) {
        setIsLoading(false)
        return
      }

      switch (activeReport) {
        case 'financial': {
          const reports = await Promise.all(targetCondominiumIds.map(id => reportService.getFinancialReport(id, start, end)))
          if (selectedCondominium !== ALL_CONDOMINIUMS_VALUE) {
            setFinancial(reports[0])
            break
          }

          const totalCharged = reports.reduce((s, r) => s + r.totalCharged, 0)
          const totalCollected = reports.reduce((s, r) => s + r.totalCollected, 0)
          const mergedMonthly = aggregateBy(
            reports.flatMap(r => r.monthlyTrend),
            item => `${item.year}-${item.month}`,
            (a, b) => ({ ...a, charged: a.charged + b.charged, collected: a.collected + b.collected })
          ).map(item => ({ ...item, collectionRate: item.charged > 0 ? (item.collected / item.charged) * 100 : 0 }))
          const mergedFeeType = aggregateBy(
            reports.flatMap(r => r.byFeeType),
            item => item.feeType,
            (a, b) => ({ ...a, amount: a.amount + b.amount, collected: a.collected + b.collected, count: a.count + b.count })
          )
          const mergedPaymentMethod = aggregateBy(
            reports.flatMap(r => r.byPaymentMethod),
            item => item.method,
            (a, b) => ({ ...a, amount: a.amount + b.amount, count: a.count + b.count })
          )

          setFinancial({
            totalCharged,
            totalCollected,
            totalPending: reports.reduce((s, r) => s + r.totalPending, 0),
            totalOverdue: reports.reduce((s, r) => s + r.totalOverdue, 0),
            collectionRate: totalCharged > 0 ? (totalCollected / totalCharged) * 100 : 0,
            totalCharges: reports.reduce((s, r) => s + r.totalCharges, 0),
            paidCharges: reports.reduce((s, r) => s + r.paidCharges, 0),
            pendingCharges: reports.reduce((s, r) => s + r.pendingCharges, 0),
            overdueCharges: reports.reduce((s, r) => s + r.overdueCharges, 0),
            unverifiedPayments: reports.reduce((s, r) => s + r.unverifiedPayments, 0),
            monthlyTrend: mergedMonthly.sort((a, b) => (a.year - b.year) || (a.month - b.month)),
            byFeeType: mergedFeeType.sort((a, b) => b.amount - a.amount),
            byPaymentMethod: mergedPaymentMethod.sort((a, b) => b.amount - a.amount),
            delinquentUnits: reports.flatMap(r => r.delinquentUnits).sort((a, b) => b.overdueAmount - a.overdueAmount)
          })
          break
        }
        case 'operational': {
          const reports = await Promise.all(targetCondominiumIds.map(id => reportService.getOperationalReport(id, start, end)))
          if (selectedCondominium !== ALL_CONDOMINIUMS_VALUE) {
            setOperational(reports[0])
            break
          }

          const totalUnits = reports.reduce((s, r) => s + r.totalUnits, 0)
          const occupiedUnits = reports.reduce((s, r) => s + r.occupiedUnits, 0)
          const buildingOccupancy = aggregateBy(
            reports.flatMap(r => r.buildingOccupancy),
            item => item.buildingName,
            (a, b) => ({ ...a, totalUnits: a.totalUnits + b.totalUnits, occupiedUnits: a.occupiedUnits + b.occupiedUnits, occupancyRate: 0 })
          ).map(item => ({ ...item, occupancyRate: item.totalUnits > 0 ? (item.occupiedUnits / item.totalUnits) * 100 : 0 }))

          setOperational({
            totalUnits,
            occupiedUnits,
            vacantUnits: reports.reduce((s, r) => s + r.vacantUnits, 0),
            underMaintenanceUnits: reports.reduce((s, r) => s + r.underMaintenanceUnits, 0),
            occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
            totalBuildings: reports.reduce((s, r) => s + r.totalBuildings, 0),
            totalAmenities: reports.reduce((s, r) => s + r.totalAmenities, 0),
            activeReservations: reports.reduce((s, r) => s + r.activeReservations, 0),
            totalReservationsInPeriod: reports.reduce((s, r) => s + r.totalReservationsInPeriod, 0),
            buildingOccupancy,
            amenityUsage: aggregateBy(
              reports.flatMap(r => r.amenityUsage),
              item => item.amenityName,
              (a, b) => ({ ...a, reservationCount: a.reservationCount + b.reservationCount, totalGuests: a.totalGuests + b.totalGuests, revenue: a.revenue + b.revenue })
            ).sort((a, b) => b.reservationCount - a.reservationCount),
            reservationTrend: aggregateBy(
              reports.flatMap(r => r.reservationTrend),
              item => `${item.year}-${item.month}`,
              (a, b) => ({ ...a, count: a.count + b.count, completed: a.completed + b.completed, cancelled: a.cancelled + b.cancelled })
            ).sort((a, b) => (a.year - b.year) || (a.month - b.month))
          })
          break
        }
        case 'residents': {
          const reports = await Promise.all(targetCondominiumIds.map(id => reportService.getResidentReport(id, start, end)))
          if (selectedCondominium !== ALL_CONDOMINIUMS_VALUE) {
            setResidents(reports[0])
            break
          }

          const totalResidents = reports.reduce((s, r) => s + r.totalResidents, 0)
          const byType = aggregateBy(
            reports.flatMap(r => r.byType),
            item => item.type,
            (a, b) => ({ ...a, count: a.count + b.count, percentage: 0 })
          ).map(item => ({ ...item, percentage: totalResidents > 0 ? (item.count / totalResidents) * 100 : 0 }))

          setResidents({
            totalResidents,
            owners: reports.reduce((s, r) => s + r.owners, 0),
            tenants: reports.reduce((s, r) => s + r.tenants, 0),
            familyMembers: reports.reduce((s, r) => s + r.familyMembers, 0),
            activeResidents: reports.reduce((s, r) => s + r.activeResidents, 0),
            pendingInvitations: reports.reduce((s, r) => s + r.pendingInvitations, 0),
            newResidentsInPeriod: reports.reduce((s, r) => s + r.newResidentsInPeriod, 0),
            movedOutInPeriod: reports.reduce((s, r) => s + r.movedOutInPeriod, 0),
            byType,
            byBuilding: aggregateBy(
              reports.flatMap(r => r.byBuilding),
              item => item.buildingName,
              (a, b) => ({ ...a, totalResidents: a.totalResidents + b.totalResidents, owners: a.owners + b.owners, tenants: a.tenants + b.tenants })
            ),
            monthlyTrend: aggregateBy(
              reports.flatMap(r => r.monthlyTrend),
              item => `${item.year}-${item.month}`,
              (a, b) => ({ ...a, newResidents: a.newResidents + b.newResidents, movedOut: a.movedOut + b.movedOut })
            ).sort((a, b) => (a.year - b.year) || (a.month - b.month))
          })
          break
        }
        case 'incidents': {
          const reports = await Promise.all(targetCondominiumIds.map(id => reportService.getIncidentReport(id, start, end)))
          if (selectedCondominium !== ALL_CONDOMINIUMS_VALUE) {
            setIncidents(reports[0])
            break
          }

          const totalIncidents = reports.reduce((s, r) => s + r.totalIncidents, 0)
          const weightedResolutionSum = reports.reduce((s, r) => s + (r.avgResolutionDays * r.totalIncidents), 0)

          setIncidents({
            totalIncidents,
            openIncidents: reports.reduce((s, r) => s + r.openIncidents, 0),
            inProgressIncidents: reports.reduce((s, r) => s + r.inProgressIncidents, 0),
            resolvedIncidents: reports.reduce((s, r) => s + r.resolvedIncidents, 0),
            closedIncidents: reports.reduce((s, r) => s + r.closedIncidents, 0),
            cancelledIncidents: reports.reduce((s, r) => s + r.cancelledIncidents, 0),
            avgResolutionDays: totalIncidents > 0 ? weightedResolutionSum / totalIncidents : 0,
            byType: aggregateBy(
              reports.flatMap(r => r.byType),
              item => item.type,
              (a, b) => ({ ...a, count: a.count + b.count, open: a.open + b.open, resolved: a.resolved + b.resolved })
            ).sort((a, b) => b.count - a.count),
            byPriority: aggregateBy(
              reports.flatMap(r => r.byPriority),
              item => item.priority,
              (a, b) => ({ ...a, count: a.count + b.count, percentage: 0 })
            ).map(item => ({ ...item, percentage: totalIncidents > 0 ? (item.count / totalIncidents) * 100 : 0 })),
            monthlyTrend: aggregateBy(
              reports.flatMap(r => r.monthlyTrend),
              item => `${item.year}-${item.month}`,
              (a, b) => ({ ...a, created: a.created + b.created, resolved: a.resolved + b.resolved })
            ).sort((a, b) => (a.year - b.year) || (a.month - b.month)),
            byBuilding: aggregateBy(
              reports.flatMap(r => r.byBuilding),
              item => item.buildingName,
              (a, b) => ({ ...a, total: a.total + b.total, open: a.open + b.open, resolved: a.resolved + b.resolved })
            ).sort((a, b) => b.total - a.total)
          })
          break
        }
        case 'communications': {
          const reports = await Promise.all(targetCondominiumIds.map(id => reportService.getCommunicationsReport(id, start, end)))
          if (selectedCondominium !== ALL_CONDOMINIUMS_VALUE) {
            setCommunications(reports[0])
            break
          }

          setCommunications({
            totalAnnouncements: reports.reduce((s, r) => s + r.totalAnnouncements, 0),
            publishedAnnouncements: reports.reduce((s, r) => s + r.publishedAnnouncements, 0),
            totalPolls: reports.reduce((s, r) => s + r.totalPolls, 0),
            activePolls: reports.reduce((s, r) => s + r.activePolls, 0),
            totalMeetings: reports.reduce((s, r) => s + r.totalMeetings, 0),
            totalForumPosts: reports.reduce((s, r) => s + r.totalForumPosts, 0),
            announcementsByType: aggregateBy(
              reports.flatMap(r => r.announcementsByType),
              item => item.type,
              (a, b) => ({ ...a, count: a.count + b.count })
            ).sort((a, b) => b.count - a.count),
            monthlyTrend: aggregateBy(
              reports.flatMap(r => r.monthlyTrend),
              item => `${item.year}-${item.month}`,
              (a, b) => ({ ...a, announcements: a.announcements + b.announcements, polls: a.polls + b.polls, meetings: a.meetings + b.meetings, forumPosts: a.forumPosts + b.forumPosts })
            ).sort((a, b) => (a.year - b.year) || (a.month - b.month))
          })
          break
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar el reporte')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCondominium, dateRange, activeReport, condominiums])

  useEffect(() => { loadReport() }, [loadReport])

  // Export handlers
  const handleExport = () => {
    switch (activeReport) {
      case 'financial': exportFinancial(); break
      case 'operational': exportOperational(); break
      case 'residents': exportResidents(); break
      case 'incidents': exportIncidents(); break
      case 'communications': exportCommunications(); break
    }
  }

  const exportFinancial = () => {
    if (!financial) return
    downloadCSV('reporte_financiero.csv',
      ['Mes', 'Cobrado', 'Recaudado', 'Tasa Recaudación'],
      financial.monthlyTrend.map(t => [t.label, t.charged, t.collected, t.collectionRate])
    )
  }
  const exportOperational = () => {
    if (!operational) return
    downloadCSV('reporte_operacional.csv',
      ['Edificio', 'Total Unidades', 'Ocupadas', 'Tasa Ocupación'],
      operational.buildingOccupancy.map(b => [b.buildingName, b.totalUnits, b.occupiedUnits, b.occupancyRate])
    )
  }
  const exportResidents = () => {
    if (!residents) return
    downloadCSV('reporte_residentes.csv',
      ['Edificio', 'Total', 'Propietarios', 'Inquilinos'],
      residents.byBuilding.map(b => [b.buildingName, b.totalResidents, b.owners, b.tenants])
    )
  }
  const exportIncidents = () => {
    if (!incidents) return
    downloadCSV('reporte_incidencias.csv',
      ['Tipo', 'Total', 'Abiertas', 'Resueltas'],
      incidents.byType.map(t => [t.type, t.count, t.open, t.resolved])
    )
  }
  const exportCommunications = () => {
    if (!communications) return
    downloadCSV('reporte_comunicaciones.csv',
      ['Mes', 'Anuncios', 'Encuestas', 'Reuniones', 'Foro'],
      communications.monthlyTrend.map(t => [t.label, t.announcements, t.polls, t.meetings, t.forumPosts])
    )
  }

  const tabs: { key: ReportType; label: string; icon: React.ElementType }[] = [
    { key: 'financial', label: 'Financiero', icon: DollarSign },
    { key: 'operational', label: 'Operacional', icon: Home },
    { key: 'residents', label: 'Residentes', icon: Users },
    { key: 'incidents', label: 'Incidencias', icon: AlertCircle },
    { key: 'communications', label: 'Comunicaciones', icon: Megaphone },
  ]

  // ========== Render Financial ==========
  const renderFinancial = () => {
    if (!financial) return null
    const d = financial
    const trendMax = maxOf(d.monthlyTrend.map(t => Math.max(t.charged, t.collected)))
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={DollarSign} label="Total Cobrado" value={fmtMoney(d.totalCharged)} color="text-blue-600" bgColor="bg-blue-50" />
          <StatCard icon={CheckCircle} label="Total Recaudado" value={fmtMoney(d.totalCollected)} sub={`Tasa: ${fmtPct(d.collectionRate)}`} color="text-green-600" bgColor="bg-green-50" />
          <StatCard icon={Clock} label="Pendiente" value={fmtMoney(d.totalPending)} sub={`${d.pendingCharges} cargos`} color="text-amber-600" bgColor="bg-amber-50" />
          <StatCard icon={AlertCircle} label="Vencido" value={fmtMoney(d.totalOverdue)} sub={`${d.overdueCharges} cargos`} color="text-red-600" bgColor="bg-red-50" />
        </div>

        {/* Overview strip */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div><p className="text-xs text-gray-500">Total Cargos</p><p className="text-xl font-bold">{d.totalCharges}</p></div>
          <div><p className="text-xs text-gray-500">Pagados</p><p className="text-xl font-bold text-green-600">{d.paidCharges}</p></div>
          <div><p className="text-xs text-gray-500">Pendientes</p><p className="text-xl font-bold text-amber-600">{d.pendingCharges}</p></div>
          <div><p className="text-xs text-gray-500">Vencidos</p><p className="text-xl font-bold text-red-600">{d.overdueCharges}</p></div>
          <div><p className="text-xs text-gray-500">Por Verificar</p><p className="text-xl font-bold text-orange-500">{d.unverifiedPayments}</p></div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <SectionTitle>Tendencia Mensual</SectionTitle>
          {d.monthlyTrend.length === 0 ? <p className="text-sm text-gray-400">Sin datos para el período</p> : (
            <div className="space-y-3">
              {d.monthlyTrend.map((t, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{t.label}</span>
                    <span className="text-gray-500">{fmtMoney(t.collected)} / {fmtMoney(t.charged)}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <ProgressBar value={t.charged} max={trendMax} color="bg-blue-200" />
                      <div className="absolute top-0 left-0 h-full"><ProgressBar value={t.collected} max={trendMax} color="bg-blue-600" /></div>
                    </div>
                    <span className="text-xs font-medium text-gray-500 w-14 text-right">{fmtPct(t.collectionRate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fee Type & Payment Method */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Por Tipo de Cargo</SectionTitle>
            {d.byFeeType.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
              <div className="space-y-3">
                {d.byFeeType.map((f, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{f.feeType}</span>
                      <span className="text-gray-500">{fmtMoney(f.collected)} / {fmtMoney(f.amount)} ({f.count})</span>
                    </div>
                    <ProgressBar value={f.collected} max={f.amount || 1} color="bg-indigo-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Por Método de Pago</SectionTitle>
            {d.byPaymentMethod.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
              <div className="space-y-3">
                {d.byPaymentMethod.map((m, i) => {
                  const total = d.byPaymentMethod.reduce((s, x) => s + x.amount, 0)
                  const pct = total > 0 ? (m.amount / total * 100) : 0
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{m.method}</span>
                          <span className="text-gray-500">{fmtMoney(m.amount)} ({m.count})</span>
                        </div>
                        <ProgressBar value={pct} max={100} color="bg-emerald-500" />
                      </div>
                      <span className="text-xs font-medium text-gray-400 w-12 text-right">{fmtPct(pct)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Delinquent Units */}
        {d.delinquentUnits.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Unidades Morosas</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2">Unidad</th>
                    <th className="px-4 py-2">Edificio</th>
                    <th className="px-4 py-2 text-right">Monto Vencido</th>
                    <th className="px-4 py-2 text-right">Cargos</th>
                    <th className="px-4 py-2 text-right">Días</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {d.delinquentUnits.map((u, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2 font-medium">{u.unitNumber}</td>
                      <td className="px-4 py-2 text-gray-500">{u.buildingName}</td>
                      <td className="px-4 py-2 text-right text-red-600 font-medium">{fmtMoney(u.overdueAmount)}</td>
                      <td className="px-4 py-2 text-right">{u.overdueCharges}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.daysOverdue > 60 ? 'bg-red-100 text-red-800' : u.daysOverdue > 30 ? 'bg-amber-100 text-amber-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {u.daysOverdue}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ========== Render Operational ==========
  const renderOperational = () => {
    if (!operational) return null
    const d = operational
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Home} label="Total Unidades" value={d.totalUnits} sub={`${d.occupiedUnits} ocupadas`} color="text-blue-600" bgColor="bg-blue-50" />
          <StatCard icon={Building2} label="Edificios" value={d.totalBuildings} color="text-purple-600" bgColor="bg-purple-50" />
          <StatCard icon={TrendingUp} label="Tasa Ocupación" value={fmtPct(d.occupancyRate)} sub={`${d.vacantUnits} vacantes`} color="text-green-600" bgColor="bg-green-50" />
          <StatCard icon={Calendar} label="Reservaciones" value={d.totalReservationsInPeriod} sub={`${d.activeReservations} activas`} color="text-amber-600" bgColor="bg-amber-50" />
        </div>

        {/* Building Occupancy */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <SectionTitle>Ocupación por Edificio</SectionTitle>
          {d.buildingOccupancy.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
            <div className="space-y-3">
              {d.buildingOccupancy.map((b, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{b.buildingName}</span>
                    <span className="text-gray-500">{b.occupiedUnits}/{b.totalUnits} ({fmtPct(b.occupancyRate)})</span>
                  </div>
                  <ProgressBar value={b.occupiedUnits} max={b.totalUnits} color={b.occupancyRate >= 80 ? 'bg-green-500' : b.occupancyRate >= 50 ? 'bg-amber-500' : 'bg-red-500'} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Amenity Usage & Reservation Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Uso de Amenidades</SectionTitle>
            {d.amenityUsage.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
              <div className="space-y-3">
                {d.amenityUsage.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{a.amenityName}</p>
                      <p className="text-xs text-gray-500">{a.reservationCount} reservaciones · {a.totalGuests} invitados</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{fmtMoney(a.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Tendencia de Reservaciones</SectionTitle>
            {d.reservationTrend.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
              <div className="space-y-3">
                {d.reservationTrend.map((t, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{t.label}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-blue-600">{t.count} total</span>
                        <span className="text-green-600">{t.completed} completadas</span>
                        <span className="text-red-500">{t.cancelled} canceladas</span>
                      </div>
                    </div>
                    <ProgressBar value={t.count} max={maxOf(d.reservationTrend.map(x => x.count))} color="bg-blue-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ========== Render Residents ==========
  const renderResidents = () => {
    if (!residents) return null
    const d = residents
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Residentes" value={d.totalResidents} sub={`${d.activeResidents} activos`} color="text-blue-600" bgColor="bg-blue-50" />
          <StatCard icon={Home} label="Propietarios" value={d.owners} color="text-indigo-600" bgColor="bg-indigo-50" />
          <StatCard icon={ArrowUpRight} label="Nuevos en Período" value={d.newResidentsInPeriod} color="text-green-600" bgColor="bg-green-50" />
          <StatCard icon={ArrowDownRight} label="Salieron en Período" value={d.movedOutInPeriod} color="text-red-600" bgColor="bg-red-50" />
        </div>

        {/* Quick stats */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div><p className="text-xs text-gray-500">Inquilinos</p><p className="text-xl font-bold">{d.tenants}</p></div>
          <div><p className="text-xs text-gray-500">Familiares</p><p className="text-xl font-bold">{d.familyMembers}</p></div>
          <div><p className="text-xs text-gray-500">Invitaciones Pend.</p><p className="text-xl font-bold text-amber-600">{d.pendingInvitations}</p></div>
          <div><p className="text-xs text-gray-500">Activos</p><p className="text-xl font-bold text-green-600">{d.activeResidents}</p></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Type */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Distribución por Tipo</SectionTitle>
            <div className="space-y-3">
              {d.byType.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{t.type}</span>
                    <span className="text-gray-500">{t.count} ({fmtPct(t.percentage)})</span>
                  </div>
                  <ProgressBar value={t.percentage} max={100} color={['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'][i % 4]} />
                </div>
              ))}
            </div>
          </div>
          {/* By Building */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Residentes por Edificio</SectionTitle>
            {d.byBuilding.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
              <div className="space-y-3">
                {d.byBuilding.map((b, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-800">{b.buildingName}</span>
                      <span className="text-sm text-gray-500">{b.totalResidents} total</span>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Propietarios: <b className="text-gray-700">{b.owners}</b></span>
                      <span>Inquilinos: <b className="text-gray-700">{b.tenants}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Monthly trend */}
        {d.monthlyTrend.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Tendencia Mensual</SectionTitle>
            <div className="space-y-3">
              {d.monthlyTrend.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                  <span className="font-medium text-gray-700">{t.label}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />{t.newResidents} nuevos</span>
                    <span className="text-red-500 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" />{t.movedOut} salieron</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ========== Render Incidents ==========
  const renderIncidents = () => {
    if (!incidents) return null
    const d = incidents
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={AlertCircle} label="Total Incidencias" value={d.totalIncidents} color="text-blue-600" bgColor="bg-blue-50" />
          <StatCard icon={ShieldAlert} label="Abiertas" value={d.openIncidents} sub={`${d.inProgressIncidents} en progreso`} color="text-amber-600" bgColor="bg-amber-50" />
          <StatCard icon={CheckCircle} label="Resueltas" value={d.resolvedIncidents} sub={`${d.closedIncidents} cerradas`} color="text-green-600" bgColor="bg-green-50" />
          <StatCard icon={Clock} label="Resolución Promedio" value={`${d.avgResolutionDays.toFixed(1)}d`} color="text-purple-600" bgColor="bg-purple-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Type */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Por Tipo</SectionTitle>
            {d.byType.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
              <div className="space-y-3">
                {d.byType.map((t, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{t.type}</span>
                      <div className="flex gap-2 text-xs">
                        <span className="text-amber-600">{t.open} abiertas</span>
                        <span className="text-green-600">{t.resolved} resueltas</span>
                      </div>
                    </div>
                    <ProgressBar value={t.count} max={maxOf(d.byType.map(x => x.count))} color="bg-blue-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* By Priority */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Por Prioridad</SectionTitle>
            {d.byPriority.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
              <div className="space-y-3">
                {d.byPriority.map((p, i) => {
                  const colors = ['bg-green-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-600']
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{p.priority}</span>
                        <span className="text-gray-500">{p.count} ({fmtPct(p.percentage)})</span>
                      </div>
                      <ProgressBar value={p.percentage} max={100} color={colors[i % 4]} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* By Building */}
        {d.byBuilding.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Por Edificio</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-2">Edificio</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Abiertas</th>
                    <th className="px-4 py-2 text-right">Resueltas</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {d.byBuilding.map((b, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2 font-medium">{b.buildingName}</td>
                      <td className="px-4 py-2 text-right">{b.total}</td>
                      <td className="px-4 py-2 text-right text-amber-600">{b.open}</td>
                      <td className="px-4 py-2 text-right text-green-600">{b.resolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Trend */}
        {d.monthlyTrend.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Tendencia Mensual</SectionTitle>
            <div className="space-y-3">
              {d.monthlyTrend.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                  <span className="font-medium text-gray-700">{t.label}</span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-blue-600">{t.created} creadas</span>
                    <span className="text-green-600">{t.resolved} resueltas</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ========== Render Communications ==========
  const renderCommunications = () => {
    if (!communications) return null
    const d = communications
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Megaphone} label="Anuncios" value={d.totalAnnouncements} sub={`${d.publishedAnnouncements} publicados`} color="text-blue-600" bgColor="bg-blue-50" />
          <StatCard icon={BarChart3} label="Encuestas" value={d.totalPolls} sub={`${d.activePolls} activas`} color="text-purple-600" bgColor="bg-purple-50" />
          <StatCard icon={Calendar} label="Reuniones" value={d.totalMeetings} color="text-green-600" bgColor="bg-green-50" />
          <StatCard icon={Users} label="Posts en Foro" value={d.totalForumPosts} color="text-indigo-600" bgColor="bg-indigo-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Announcements by type */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Anuncios por Tipo</SectionTitle>
            {d.announcementsByType.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
              <div className="space-y-3">
                {d.announcementsByType.map((a, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{a.type}</span>
                      <span className="text-gray-500">{a.count}</span>
                    </div>
                    <ProgressBar value={a.count} max={maxOf(d.announcementsByType.map(x => x.count))} color={['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-purple-500'][i % 5]} />
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Monthly trend */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <SectionTitle>Tendencia Mensual</SectionTitle>
            {d.monthlyTrend.length === 0 ? <p className="text-sm text-gray-400">Sin datos</p> : (
              <div className="space-y-3">
                {d.monthlyTrend.map((t, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                    <p className="font-medium text-gray-700 mb-1">{t.label}</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t.announcements} anuncios</span>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{t.polls} encuestas</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t.meetings} reuniones</span>
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{t.forumPosts} foro</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ========== Render active tab content ==========
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p>Cargando reporte...</p>
        </div>
      )
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-red-400">
          <AlertCircle className="w-8 h-8 mb-3" />
          <p>{error}</p>
          <button onClick={loadReport} className="mt-3 text-sm text-indigo-600 hover:underline">Reintentar</button>
        </div>
      )
    }
    switch (activeReport) {
      case 'financial': return renderFinancial()
      case 'operational': return renderOperational()
      case 'residents': return renderResidents()
      case 'incidents': return renderIncidents()
      case 'communications': return renderCommunications()
    }
  }

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reportes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Análisis detallado del condominio</p>
        </div>
        <button
          onClick={handleExport}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none text-sm font-medium transition-all"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              <Filter className="w-3 h-3 inline mr-1" />Condominio
            </label>
            <select
              value={selectedCondominium}
              onChange={e => setSelectedCondominium(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {condominiums.length > 1 && (
                <option value={ALL_CONDOMINIUMS_VALUE}>Todos los condominios</option>
              )}
              {condominiums.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              <Calendar className="w-3 h-3 inline mr-1" />Desde
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              <Calendar className="w-3 h-3 inline mr-1" />Hasta
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-md disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {tabs.map(tab => {
            const active = activeReport === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveReport(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap rounded-t-lg transition-all ${
                  active
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  )
}

