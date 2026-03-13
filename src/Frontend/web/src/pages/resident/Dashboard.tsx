import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { residentService } from '../../lib/residentService';
import { billingService } from '../../lib/billingService';
import { reservationService, ReservationStatus } from '../../lib/reservationService';
import { incidentService, IncidentStatus } from '../../lib/incidentService';
import { 
  CreditCardIcon, 
  CalendarIcon, 
  ExclamationTriangleIcon,
  HomeIcon,
  BellAlertIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface DashboardData {
  balance: number;
  overdueAmount: number;
  nextDueDate: string | null;
  reservationsCount: number;
  nextReservation: string | null;
  openIncidentsCount: number;
  unitNumber: string;
  buildingName: string;
}

interface RecentActivityItem {
  id: string;
  type: 'incident' | 'reservation' | 'payment';
  title: string;
  description: string;
  timestamp: string;
}

function ResidentDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [data, setData] = useState<DashboardData>({
    balance: 0,
    overdueAmount: 0,
    nextDueDate: null,
    reservationsCount: 0,
    nextReservation: null,
    openIncidentsCount: 0,
    unitNumber: '',
    buildingName: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  const formatRelativeTime = (timestamp: string) => {
    const now = Date.now();
    const value = new Date(timestamp).getTime();
    const diff = now - value;

    if (Number.isNaN(value) || diff < 0) {
      return 'Hace un momento';
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes === 1 ? '' : 's'}`;
    if (hours < 24) return `Hace ${hours} hora${hours === 1 ? '' : 's'}`;
    return `Hace ${days} día${days === 1 ? '' : 's'}`;
  };

  const getRecentActivityIcon = (type: RecentActivityItem['type']) => {
    switch (type) {
      case 'incident':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'reservation':
        return <CalendarIcon className="h-5 w-5 text-blue-500" />;
      case 'payment':
        return <CreditCardIcon className="h-5 w-5 text-green-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const loadDashboardData = async () => {
    if (!user?.id) {
      setRecentActivities([]);
      return;
    }
    
    try {
      // Obtener información del residente
      const resident = await residentService.getResidentInfo(user.id);
      
      if (!resident || !resident.unitId) {
        setRecentActivities([]);
        setLoading(false);
        return;
      }

      let dashboardData: DashboardData = {
        balance: 0,
        overdueAmount: 0,
        nextDueDate: null,
        reservationsCount: 0,
        nextReservation: null,
        openIncidentsCount: 0,
        unitNumber: resident.unitNumber || '',
        buildingName: resident.buildingName || ''
      };

      const activityItems: RecentActivityItem[] = [];

      // Cargar balance
      try {
        const balanceData = await billingService.getUnitBalance(resident.unitId);
        // Handle both camelCase and PascalCase from backend
        dashboardData.balance = balanceData.balance ?? (balanceData as any).Balance ?? 0;
        // Backend returns OverdueCharges (count) not overdueAmount
        const overdueCharges = (balanceData as any).OverdueCharges ?? balanceData.overdueAmount ?? 0;
        // If there are overdue charges, the balance is the overdue amount
        dashboardData.overdueAmount = overdueCharges > 0 ? dashboardData.balance : 0;
      } catch (e) {
        console.warn('Error loading balance:', e);
      }

      try {
        const unitCharges = await billingService.getUnitCharges(resident.unitId);
        const paymentActivities = unitCharges
          .flatMap((charge) =>
            charge.payments.map((payment) => ({
              id: payment.id,
              type: 'payment' as const,
              title: 'Pago registrado',
              description: `${charge.concept} - $${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
              timestamp: payment.paymentDate
            }))
          )
          .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
          .slice(0, 5);

        activityItems.push(...paymentActivities);
      } catch (e) {
        console.warn('Error loading payment activity:', e);
      }

      // Cargar reservaciones
      try {
        const reservations = await reservationService.getByUnit(resident.unitId);
        const confirmedReservations = reservations.filter(
          (r: any) => r.status === ReservationStatus.Confirmed && new Date(r.reservationDate) >= new Date()
        );
        dashboardData.reservationsCount = confirmedReservations.length;
        if (confirmedReservations.length > 0) {
          const next = confirmedReservations.sort((a: any, b: any) => 
            new Date(a.reservationDate).getTime() - new Date(b.reservationDate).getTime()
          )[0];
          dashboardData.nextReservation = `${next.amenityName} - ${new Date(next.reservationDate).toLocaleDateString('es-ES')}`;
        }

        const reservationActivities = reservations
          .map((reservation) => ({
            id: reservation.id,
            type: 'reservation' as const,
            title: reservation.status === ReservationStatus.Confirmed
              ? 'Reservación confirmada'
              : reservation.status === ReservationStatus.Pending
                ? 'Reservación pendiente'
                : 'Actualización de reservación',
            description: `${reservation.amenityName} - ${new Date(reservation.reservationDate).toLocaleDateString('es-ES')}`,
            timestamp: reservation.createdAt
          }))
          .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
          .slice(0, 5);

        activityItems.push(...reservationActivities);
      } catch (e) {
        console.warn('Error loading reservations:', e);
      }

      // Cargar incidentes
      try {
        const incidents = await incidentService.getMyIncidents(user.id);
        dashboardData.openIncidentsCount = incidents.filter(
          (incident) => incident.status !== IncidentStatus.Resolved && incident.status !== IncidentStatus.Closed
        ).length;

        const incidentActivities = incidents
          .map((incident) => ({
            id: incident.id,
            type: 'incident' as const,
            title: 'Incidente reportado',
            description: `${incident.title} - ${incident.statusName}`,
            timestamp: incident.createdAt
          }))
          .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
          .slice(0, 5);

        activityItems.push(...incidentActivities);
      } catch (e) {
        console.warn('Error loading incidents:', e);
      }

      setData(dashboardData);
      setRecentActivities(
        activityItems
          .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
          .slice(0, 6)
      );
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setRecentActivities([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Mi Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {data.unitNumber ? `Unidad ${data.unitNumber} - ${data.buildingName}` : 'Bienvenido a tu panel de residente'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link to="/resident/payments" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Saldo Pendiente</h3>
            <CreditCardIcon className={`h-6 w-6 ${data.overdueAmount > 0 ? 'text-red-500' : 'text-green-500'}`} />
          </div>
          <p className={`text-4xl font-black ${data.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            ${data.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          {data.overdueAmount > 0 ? (
            <div className="flex items-center gap-2 mt-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-500 font-medium">
                ¡Pago vencido! ${data.overdueAmount.toLocaleString('es-MX')}
              </p>
            </div>
          ) : data.balance > 0 ? (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
              Pago pendiente
            </p>
          ) : (
            <p className="text-sm text-green-500 dark:text-green-400 mt-2">
              ✓ Al corriente
            </p>
          )}
        </Link>

        <Link to="/resident/reservations" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Reservaciones Activas</h3>
            <CalendarIcon className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-4xl font-black text-gray-900 dark:text-white">{data.reservationsCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {data.nextReservation || 'Sin reservaciones próximas'}
          </p>
        </Link>

        <Link to="/resident/incidents" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Incidentes Abiertos</h3>
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-4xl font-black text-gray-900 dark:text-white">{data.openIncidentsCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {data.openIncidentsCount > 0 ? 'En progreso' : 'Sin incidentes'}
          </p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            to="/resident/incidents/new" 
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <BellAlertIcon className="h-8 w-8 mb-3" />
            <h3 className="font-bold text-lg">Reportar Incidente</h3>
            <p className="text-sm opacity-90 mt-1">Informa sobre un problema</p>
          </Link>

          <Link 
            to="/resident/reservations/new" 
            className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <CalendarIcon className="h-8 w-8 mb-3" />
            <h3 className="font-bold text-lg">Reservar Amenidad</h3>
            <p className="text-sm opacity-90 mt-1">Agenda uso de áreas comunes</p>
          </Link>

          <Link 
            to="/resident/payments" 
            className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <CreditCardIcon className="h-8 w-8 mb-3" />
            <h3 className="font-bold text-lg">Ver Pagos</h3>
            <p className="text-sm opacity-90 mt-1">Consulta tu estado de cuenta</p>
          </Link>

          <Link 
            to="/resident/my-unit" 
            className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <HomeIcon className="h-8 w-8 mb-3" />
            <h3 className="font-bold text-lg">Mi Unidad</h3>
            <p className="text-sm opacity-90 mt-1">Información de tu propiedad</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Actividad Reciente</h2>
          {recentActivities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
              <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Sin actividad reciente</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Aquí aparecerán tus pagos, reservaciones e incidentes más recientes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div
                  key={activity.id}
                  className={`flex items-start space-x-3 ${index < recentActivities.length - 1 ? 'pb-4 border-b border-gray-200 dark:border-gray-700' : ''}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getRecentActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activity.description}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatRelativeTime(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Próximos Eventos</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-shrink-0 mt-1">
                <ClockIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Asamblea General</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">30 Enero 2026 - 6:00 PM</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Salón de eventos</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-shrink-0 mt-1">
                <ClockIcon className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Mantenimiento de Elevadores</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">28 Enero 2026 - 8:00 AM</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Edificio A y B</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <ClockIcon className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Evento Social</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">5 Febrero 2026 - 5:00 PM</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Área de BBQ</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResidentDashboard
