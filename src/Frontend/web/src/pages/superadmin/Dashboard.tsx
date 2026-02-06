import { useState, useEffect } from 'react';
import { 
  Building2, Users, DollarSign, AlertTriangle,
  TrendingUp, Activity, Server, Database,
  Crown, Shield, Clock, Globe
} from 'lucide-react';

interface PlatformStats {
  totalCondominiums: number;
  totalUsers: number;
  totalRevenue: number;
  activeIncidents: number;
  serverUptime: string;
  databaseSize: string;
  activeConnections: number;
  apiRequests: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats>({
    totalCondominiums: 24,
    totalUsers: 1847,
    totalRevenue: 125650,
    activeIncidents: 12,
    serverUptime: '99.97%',
    databaseSize: '2.4 GB',
    activeConnections: 156,
    apiRequests: 45230
  });

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, action: 'Nuevo condominio registrado', entity: 'Residencial Las Palmas', time: 'Hace 5 min', type: 'success' },
    { id: 2, action: 'Usuario SuperAdmin creado', entity: 'admin@empresa.com', time: 'Hace 15 min', type: 'info' },
    { id: 3, action: 'Error de conexión DB', entity: 'Servidor Backup', time: 'Hace 1 hora', type: 'error' },
    { id: 4, action: 'Backup completado', entity: 'Base de datos principal', time: 'Hace 2 horas', type: 'success' },
    { id: 5, action: 'Nuevo plan contratado', entity: 'Condominios Premium', time: 'Hace 3 horas', type: 'info' },
  ]);

  const mainStats = [
    {
      name: 'Total Condominios',
      value: stats.totalCondominiums,
      icon: Building2,
      color: 'from-blue-500 to-cyan-500',
      change: '+3 este mes'
    },
    {
      name: 'Usuarios Activos',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      change: '+127 este mes'
    },
    {
      name: 'Ingresos Totales',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      change: '+18% vs mes anterior'
    },
    {
      name: 'Incidencias Activas',
      value: stats.activeIncidents,
      icon: AlertTriangle,
      color: 'from-orange-500 to-red-500',
      change: '-5 vs semana pasada'
    }
  ];

  const systemStats = [
    { name: 'Server Uptime', value: stats.serverUptime, icon: Server, color: 'text-green-400' },
    { name: 'Database Size', value: stats.databaseSize, icon: Database, color: 'text-blue-400' },
    { name: 'Conexiones Activas', value: stats.activeConnections, icon: Globe, color: 'text-purple-400' },
    { name: 'API Requests/día', value: stats.apiRequests.toLocaleString(), icon: Activity, color: 'text-yellow-400' }
  ];

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Crown className="w-8 h-8 text-yellow-400" />
            Panel de Control - Super Admin
          </h1>
          <p className="text-gray-400 mt-2">
            Vista general de toda la plataforma NovaResidence
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-green-400 text-sm font-medium">Sistema Operativo</span>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((stat) => (
          <div
            key={stat.name}
            className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700"
          >
            <div className={`h-1 bg-gradient-to-r ${stat.color}`}></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color} bg-opacity-20`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-gray-400 mt-1">{stat.name}</p>
                <p className="text-xs text-green-400 mt-2">{stat.change}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {systemStats.map((stat) => (
          <div
            key={stat.name}
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50"
          >
            <div className="flex items-center gap-3">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Actividad Reciente
          </h2>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getActivityColor(activity.type)}`}
              >
                <div>
                  <p className="font-medium text-white">{activity.action}</p>
                  <p className="text-sm text-gray-400">{activity.entity}</p>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Clock className="w-4 h-4" />
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            Acciones Rápidas
          </h2>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 transition-colors">
              <Building2 className="w-5 h-5" />
              <span>Nuevo Condominio</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 transition-colors">
              <Users className="w-5 h-5" />
              <span>Agregar Usuario Admin</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 transition-colors">
              <Database className="w-5 h-5" />
              <span>Backup Manual</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 transition-colors">
              <Server className="w-5 h-5" />
              <span>Ver Logs del Sistema</span>
            </button>
          </div>
        </div>
      </div>

      {/* Condominiums Overview */}
      <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-400" />
          Condominios Recientes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="pb-3 font-medium">Nombre</th>
                <th className="pb-3 font-medium">Plan</th>
                <th className="pb-3 font-medium">Unidades</th>
                <th className="pb-3 font-medium">Usuarios</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {[
                { name: 'Residencial Las Palmas', plan: 'Premium', units: 120, users: 245, status: 'Activo', created: '2024-01-15' },
                { name: 'Torres del Sol', plan: 'Básico', units: 48, users: 92, status: 'Activo', created: '2024-01-10' },
                { name: 'Condominios Vista Mar', plan: 'Premium', units: 200, users: 380, status: 'Activo', created: '2024-01-05' },
                { name: 'Jardines del Norte', plan: 'Estándar', units: 75, users: 150, status: 'Pendiente', created: '2024-01-02' },
              ].map((condo, i) => (
                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-3 font-medium text-white">{condo.name}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      condo.plan === 'Premium' ? 'bg-yellow-500/20 text-yellow-400' :
                      condo.plan === 'Estándar' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {condo.plan}
                    </span>
                  </td>
                  <td className="py-3">{condo.units}</td>
                  <td className="py-3">{condo.users}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      condo.status === 'Activo' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {condo.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">{condo.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
