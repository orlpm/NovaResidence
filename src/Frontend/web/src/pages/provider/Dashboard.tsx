import { Briefcase, CalendarClock, CheckCircle2, ClipboardList } from 'lucide-react'

export default function ProviderDashboard() {
  const cards = [
    {
      title: 'Órdenes asignadas',
      value: '0',
      icon: ClipboardList,
      color: 'text-slate-600',
      bgColor: 'bg-slate-100 dark:bg-slate-900/20'
    },
    {
      title: 'Servicios completados',
      value: '0',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Próximas visitas',
      value: '0',
      icon: CalendarClock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Proveedor</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Seguimiento de actividades y servicios asignados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className={`p-3 rounded-lg ${card.bgColor} inline-block`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Estado del módulo</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          El módulo de proveedor ya cuenta con ruta y panel propio para evitar redirecciones incorrectas.
        </p>
      </div>
    </div>
  )
}
