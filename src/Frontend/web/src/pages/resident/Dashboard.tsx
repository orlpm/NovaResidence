import { Link } from 'react-router-dom';
import { 
  CreditCardIcon, 
  CalendarIcon, 
  ExclamationTriangleIcon,
  HomeIcon,
  BellAlertIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

function ResidentDashboard() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Mi Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Bienvenido a tu panel de residente</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link to="/resident/payments" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Saldo Pendiente</h3>
            <CreditCardIcon className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-4xl font-black text-red-600 dark:text-red-400">$2,500</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Vence: 15 Enero 2026</p>
        </Link>

        <Link to="/resident/reservations" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Reservaciones Activas</h3>
            <CalendarIcon className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-4xl font-black text-gray-900 dark:text-white">2</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Próxima: Piscina - Mañana</p>
        </Link>

        <Link to="/resident/incidents" className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Incidentes Abiertos</h3>
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-4xl font-black text-gray-900 dark:text-white">1</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">En progreso</p>
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
          <div className="space-y-4">
            <div className="flex items-start space-x-3 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-shrink-0 mt-1">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Incidente reportado</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fuga de agua en cocina - En progreso</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Hace 2 horas</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-shrink-0 mt-1">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Reservación confirmada</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Piscina - 24 Enero 10:00 AM</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Ayer</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <CreditCardIcon className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Pago recibido</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cuota de mantenimiento - $1,200</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Hace 3 días</p>
              </div>
            </div>
          </div>
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
