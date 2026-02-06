import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock, Home, Users, CreditCard, TrendingUp, Plus, BarChart3, Calendar, Building2, Loader2 } from 'lucide-react'
import OnboardingWizard from '../../components/onboarding/OnboardingWizard'
import type { OnboardingData } from '../../types/onboarding'
import { condominiumService, UserCondominiumDto } from '../../lib/condominiumService'
import { dashboardService, DashboardStatsDto, RecentActivityDto } from '../../lib/dashboardService'
import { useAuthStore } from '../../stores/authStore'

interface RecentActivity {
  id: string
  type: 'invitation' | 'payment' | 'incident' | 'resident'
  title: string
  description: string
  timestamp: Date
  status: 'completed' | 'pending' | 'overdue'
}

function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user: _user } = useAuthStore()
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [isLoadingCondominiums, setIsLoadingCondominiums] = useState(true)
  const [_isLoadingStats, setIsLoadingStats] = useState(true)
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [_wizardData, setWizardData] = useState<OnboardingData | null>(null)
  const [userPlan, setUserPlan] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStatsDto | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])

  useEffect(() => {
    if (location.state?.onboardingComplete) {
      setShowOnboardingSuccess(true)
      setTimeout(() => setShowOnboardingSuccess(false), 5000)
    }

    // Cargar plan del usuario
    const registrationData = localStorage.getItem('admin_registration_data')
    if (registrationData) {
      const data = JSON.parse(registrationData)
      setUserPlan(data.selectedPlan || null)
    }

    // Cargar condominios desde el backend (esto también cargará las stats)
    loadCondominiums()
  }, [location])

  const loadDashboardStats = async (condominiumIds?: string[]) => {
    setIsLoadingStats(true)
    try {
      const dashboardStats = await dashboardService.getStats(undefined, condominiumIds)
      setStats(dashboardStats)
      
      // Convertir actividades recientes del backend al formato del frontend
      const activities: RecentActivity[] = dashboardStats.recentActivities.map((activity: RecentActivityDto) => ({
        id: activity.id,
        type: activity.type as RecentActivity['type'],
        title: activity.title,
        description: activity.description,
        timestamp: new Date(activity.timestamp),
        status: activity.status as RecentActivity['status']
      }))
      setRecentActivities(activities)
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      // Fallback a datos por defecto si hay error
      setStats({
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        occupancyPercentage: 0,
        totalResidents: 0,
        activeResidents: 0,
        pendingInvitations: 0,
        openIncidents: 0,
        inProgressIncidents: 0,
        resolvedIncidentsThisMonth: 0,
        totalPendingPayments: 0,
        totalOverduePayments: 0,
        pendingPaymentsCount: 0,
        overduePaymentsCount: 0,
        collectionRatePercentage: 0,
        recentActivities: []
      })
    } finally {
      setIsLoadingStats(false)
    }
  }

  const loadCondominiums = async () => {
    setIsLoadingCondominiums(true)
    try {
      const userId = _user?.id
      const userCondominiums = await condominiumService.getAllCondominiums(userId)
      setCondominiums(userCondominiums)
      
      // Cargar stats filtradas por los condominios del usuario
      const condominiumIds = userCondominiums.map(c => c.id)
      await loadDashboardStats(condominiumIds)
      
      // Si no hay condominios, mostrar el wizard
      if (userCondominiums.length === 0) {
        setShowWizard(true)
      } else {
        setShowWizard(false)
      }
    } catch (error) {
      console.error('Error loading condominiums:', error)
      // En caso de error, verificar localStorage como fallback
      const savedData = localStorage.getItem('onboarding_wizard_data')
      if (savedData) {
        const data = JSON.parse(savedData)
        setWizardData(data)
        if (data.condominium && data.buildings?.length > 0 && data.invitationMethod) {
          setShowWizard(false)
        } else {
          setShowWizard(true)
        }
      } else {
        setShowWizard(true)
      }
      // Cargar stats sin filtro como fallback
      await loadDashboardStats()
    } finally {
      setIsLoadingCondominiums(false)
    }
  }

  const handleWizardComplete = async (data: OnboardingData) => {
    setWizardData(data)
    localStorage.setItem('onboarding_wizard_data', JSON.stringify(data))
    setShowWizard(false)
    setShowOnboardingSuccess(true)
    setTimeout(() => setShowOnboardingSuccess(false), 5000)
    
    // Recargar condominios
    await loadCondominiums()
  }

  const handleAddAnotherCondominium = () => {
    setShowWizard(true)
  }

  const occupancyPercentage = stats?.occupancyPercentage ?? 0
  const collectionPercentage = stats?.collectionRatePercentage ?? 0

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'resident':
        return <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      case 'payment':
        return <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'incident':
        return <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      default:
        return <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusBadge = (status: RecentActivity['status']) => {
    switch (status) {
      case 'completed':
        return <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
      case 'pending':
        return <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
      case 'overdue':
        return <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 1000 / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 60) return `hace ${minutes}m`
    if (hours < 24) return `hace ${hours}h`
    return `hace ${days}d`
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 pb-8">
      {/* Success Message */}
      {showOnboardingSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white rounded-2xl shadow-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6" />
            <div>
              <p className="font-semibold">¡Configuración Completada!</p>
              <p className="text-sm text-green-100">Tu condominio está listo para usar</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-2">
                Dashboard Administrativo
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gestiona y supervisa todos los aspectos de tu condominio
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Botón Agregar Condominio */}
              {!isLoadingCondominiums && condominiums.length > 0 && !showWizard && (
                <button
                  onClick={handleAddAnotherCondominium}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-green-500/30 transition-all font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>Agregar Condominio</span>
                </button>
              )}
              {/* Indicador de Plan */}
              <div className="text-right">
              {userPlan ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl shadow-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <div>
                    <p className="text-xs opacity-90">Plan Activo</p>
                    <p className="font-bold capitalize">{userPlan}</p>
                  </div>
                </div>
              ) : (
                <div className="inline-flex flex-col items-end gap-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-700">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                      <p className="text-xs">Sin Plan Activo</p>
                      <p className="font-semibold text-sm">Modo Gratuito</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/admin/plans')}
                    className="text-sm text-sky-600 dark:text-sky-400 hover:underline font-medium"
                  >
                    Ver Planes Disponibles
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>

        {/* Estado de Carga */}
        {isLoadingCondominiums && (
          <div className="mb-8 flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Cargando condominios...</span>
            </div>
          </div>
        )}

        {/* Lista de Condominios */}
        {!isLoadingCondominiums && condominiums.length > 0 && !showWizard && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Mis Condominios ({condominiums.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {condominiums.map((condo) => (
                <div
                  key={condo.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    {condo.isActive ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{condo.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{condo.address}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span>{condo.totalBuildings} edificios</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Home className="w-4 h-4" />
                      <span>{condo.totalUnits} unidades</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wizard de Configuración - Centrado en la parte superior */}
        {!isLoadingCondominiums && showWizard && (
          <div className="mb-8 animate-in fade-in duration-300">
            <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-6">
                <div className="text-center text-white">
                  <h2 className="text-2xl font-bold mb-2">Configura tu Condominio</h2>
                  <p className="text-sky-100">Completa los siguientes pasos para comenzar a gestionar tu propiedad</p>
                </div>
              </div>
              <div className="p-6">
                <OnboardingWizard
                  isEmbedded={true}
                  onComplete={handleWizardComplete}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Stats Grid - Solo mostrar si no está cargando y hay condominios */}
        {!isLoadingCondominiums && condominiums.length > 0 && !showWizard && (
          <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Occupancy */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 animate-in fade-in-50">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Home className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{occupancyPercentage}%</span>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-1">Ocupación</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.occupiedUnits ?? 0}/{stats?.totalUnits ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">unidades ocupadas</p>
          </div>

          {/* Residents */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 animate-in fade-in-50">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.totalResidents ?? 0}</span>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-1">Residentes</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.activeResidents ?? 0} activos</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{stats?.pendingInvitations ?? 0} invitaciones pendientes</p>
          </div>

          {/* Payments */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 animate-in fade-in-50">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{collectionPercentage}%</span>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-1">Cobranza</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">${(stats?.totalPendingPayments ?? 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{stats?.pendingPaymentsCount ?? 0} pagos pendientes</p>
          </div>

          {/* Incidents */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 animate-in fade-in-50">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats?.openIncidents ?? 0}</span>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-1">Incidencias Abiertas</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.inProgressIncidents ?? 0} en progreso</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{stats?.resolvedIncidentsThisMonth ?? 0} resueltas este mes</p>
          </div>
        </div>

        {/* Secondary Stats and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in-50">
              <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Actividad Reciente
                </h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{activity.title}</h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(activity.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                      </div>
                      {getStatusBadge(activity.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="space-y-6">
            {/* Add New Resident */}
            <button className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 animate-in fade-in-50 text-left">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                  <Plus className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-1">Nuevo Residente</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Invita a un nuevo habitante</p>
            </button>

            {/* Reports */}
            <button className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 animate-in fade-in-50 text-left">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-1">Reportes</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Ver análisis detallados</p>
            </button>

            {/* Documents */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 animate-in fade-in-50">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{stats?.overduePaymentsCount ?? 0}</span>
                </div>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-1">Pagos Vencidos</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">${(stats?.totalOverduePayments ?? 0).toLocaleString()} total</p>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
