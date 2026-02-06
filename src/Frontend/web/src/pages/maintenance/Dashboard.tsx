import { Wrench, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function MaintenanceDashboard() {
  const stats = [
    {
      name: 'Asignadas',
      value: '8',
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20'
    },
    {
      name: 'En Progreso',
      value: '5',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      name: 'Completadas',
      value: '23',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      name: 'Pendientes',
      value: '3',
      icon: Wrench,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Panel de Mantenimiento
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gestión de incidencias y tareas de mantenimiento
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className={`p-3 rounded-lg ${stat.bgColor} inline-block`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {stat.name}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* My Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-yellow-600" />
          Mis Tareas Asignadas
        </h2>
        <div className="space-y-3">
          {[
            { title: 'Reparar fuga en Unidad 305', priority: 'Alta', status: 'En Progreso' },
            { title: 'Revisar iluminación en estacionamiento', priority: 'Media', status: 'Pendiente' },
            { title: 'Mantenimiento de elevadores', priority: 'Alta', status: 'Asignada' },
            { title: 'Pintura en áreas comunes', priority: 'Baja', status: 'Pendiente' }
          ].map((task, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {task.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.priority === 'Alta' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    task.priority === 'Media' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {task.priority}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {task.status}
                  </span>
                </div>
              </div>
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">
                Ver Detalles
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
