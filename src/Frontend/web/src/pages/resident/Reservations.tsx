import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { residentService } from '../../lib/residentService';
import { reservationService, ReservationStatus } from '../../lib/reservationService';
import { CalendarIcon, ClockIcon, UsersIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Reservation {
  id: string;
  amenityName: string;
  unitNumber: string;
  residentName: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  statusName: string;
  numberOfGuests: number;
  totalCost: number | null;
  createdAt: string;
}

function Reservations() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ReservationStatus | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    loadReservations();
  }, [user?.id]);

  const loadReservations = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Obtener información del residente
      const resident = await residentService.getResidentInfo(user.id);
      if (resident && resident.unitId) {
        const reservations = await reservationService.getByUnit(resident.unitId);
        setReservations(reservations as unknown as Reservation[]);
      }
    } catch (error: any) {
      console.warn('Error loading reservations:', error);
      // Solo mostrar error si no es un problema de "no hay datos"
      if (error.response?.status !== 404) {
        toast.error('Error al cargar reservaciones');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (reservationId: string) => {
    setCancelingId(reservationId);
    try {
      await reservationService.cancel(reservationId, {
        reason: 'Cancelación solicitada por el residente'
      });
      toast.success('Reservación cancelada exitosamente');
      await loadReservations();
    } catch (error: any) {
      console.error('Error canceling reservation:', error);
      toast.error('Error al cancelar la reservación');
    } finally {
      setCancelingId(null);
    }
  };

  const filteredReservations = selectedStatus !== null
    ? reservations.filter(r => r.status === selectedStatus)
    : reservations;

  const upcomingReservations = reservations.filter(r => 
    new Date(r.reservationDate) > new Date() && 
    r.status === ReservationStatus.Confirmed
  );

  const getStatusColor = (status: ReservationStatus) => {
    switch (status) {
      case ReservationStatus.Confirmed:
        return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      case ReservationStatus.Pending:
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case ReservationStatus.Cancelled:
        return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
      case ReservationStatus.Completed:
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Mis Reservaciones</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Gestiona tus reservas de amenidades</p>
        </div>
        <button
          onClick={() => navigate('/resident/reservations/new')}
          className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 transition-colors shadow-lg hover:shadow-xl"
        >
          <PlusIcon className="w-5 h-5" />
          Nueva Reservación
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Total Reservaciones</h3>
            <CalendarIcon className="h-6 w-6 text-sky-500" />
          </div>
          <p className="text-4xl font-black text-sky-600 dark:text-sky-400">{reservations.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Todas tus reservas</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Próximas</h3>
            <ClockIcon className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-4xl font-black text-green-600 dark:text-green-400">{upcomingReservations.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Reservaciones confirmadas</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Completadas</h3>
            <CalendarIcon className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-4xl font-black text-blue-600 dark:text-blue-400">
            {reservations.filter(r => r.status === ReservationStatus.Completed).length}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Eventos realizados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedStatus(null)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === null
              ? 'bg-sky-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setSelectedStatus(ReservationStatus.Confirmed)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === ReservationStatus.Confirmed
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Confirmadas
        </button>
        <button
          onClick={() => setSelectedStatus(ReservationStatus.Pending)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === ReservationStatus.Pending
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setSelectedStatus(ReservationStatus.Completed)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === ReservationStatus.Completed
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Completadas
        </button>
      </div>

      {/* Reservations List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando reservaciones...</p>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">No hay reservaciones en esta categoría</p>
          <button
            onClick={() => navigate('/resident/reservations/new')}
            className="px-6 py-3 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 transition-colors"
          >
            Crear Nueva Reservación
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map(reservation => (
            <div
              key={reservation.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{reservation.amenityName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Unidad {reservation.unitNumber}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(reservation.status)}`}>
                    {reservation.statusName}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Fecha</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {new Date(reservation.reservationDate).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Horario</p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {reservation.startTime} - {reservation.endTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Huéspedes</p>
                      <p className="font-bold text-gray-900 dark:text-white">{reservation.numberOfGuests}</p>
                    </div>
                  </div>

                  {reservation.totalCost && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Costo</p>
                      <p className="font-bold text-gray-900 dark:text-white">${reservation.totalCost.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {reservation.status === ReservationStatus.Confirmed && new Date(reservation.reservationDate) > new Date() && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCancel(reservation.id)}
                      disabled={cancelingId === reservation.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      <XMarkIcon className="w-5 h-5" />
                      {cancelingId === reservation.id ? 'Cancelando...' : 'Cancelar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Reservations;
