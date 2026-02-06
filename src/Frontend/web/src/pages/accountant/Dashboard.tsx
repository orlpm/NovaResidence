import { Calculator, DollarSign, TrendingUp, FileText } from 'lucide-react';

export default function AccountantDashboard() {
  const stats = [
    {
      name: 'Ingresos del Mes',
      value: '$45,230',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      change: '+12%'
    },
    {
      name: 'Pendientes de Cobro',
      value: '$8,450',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      change: '-5%'
    },
    {
      name: 'Cargos Generados',
      value: '124',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      change: '+8'
    },
    {
      name: 'Tasa de Cobro',
      value: '94%',
      icon: Calculator,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
      change: '+2%'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Panel de Contabilidad
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gestión financiera y reportes contables
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className="text-sm font-medium text-green-600">
                {stat.change}
              </span>
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

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Resumen Mensual
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Facturado</span>
              <span className="font-bold text-gray-900 dark:text-white">$52,680</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Cobrado</span>
              <span className="font-bold text-green-600">$45,230</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Pendiente</span>
              <span className="font-bold text-orange-600">$8,450</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Gastos</span>
              <span className="font-bold text-red-600">$12,300</span>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-white">Balance Neto</span>
                <span className="font-bold text-2xl text-emerald-600">$32,930</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Tareas Pendientes
          </h2>
          <div className="space-y-3">
            {[
              'Revisar facturas del mes',
              'Generar reporte trimestral',
              'Conciliar pagos pendientes',
              'Actualizar presupuesto anual'
            ].map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                <span className="text-gray-900 dark:text-white">{task}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
