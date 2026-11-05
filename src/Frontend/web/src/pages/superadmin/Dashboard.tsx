import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, Activity, Server, Database,
  Crown, Shield, Clock, Globe, RefreshCw,
  Eye, ChevronRight
} from 'lucide-react';
import { userManagementService, UserListItem } from '../../lib/userManagementService';
import { superAdminService, type MonitoringSummaryDto } from '../../lib/superAdminService';

interface PlatformStats {
  totalCondominiums: number;
  totalUsers: number;
  openIncidents: number;
  uptimeMinutes: number;
  processMemoryMb: number;
  activeUsers: number;
  databaseConnected: boolean;
}

interface RecentActivity {
  id: number;
  action: string;
  entity: string;
  time: string;
  type: 'success' | 'error' | 'info';
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserListItem[]>([]);

  const [stats, setStats] = useState<PlatformStats>({
    totalCondominiums: 0,
    totalUsers: 0,
    openIncidents: 0,
    uptimeMinutes: 0,
    processMemoryMb: 0,
    activeUsers: 0,
    databaseConnected: false
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar usuarios reales desde la API
      const [usersData, monitoring] = await Promise.all([
        userManagementService.getUsers(),
        superAdminService.getMonitoring().catch(() => null as MonitoringSummaryDto | null)
      ]);
      setUsers(usersData);

      setStats({
        totalCondominiums: monitoring?.totalCondominiums ?? 0,
        totalUsers: monitoring?.totalUsers ?? usersData.length,
        openIncidents: monitoring?.openIncidents ?? 0,
        uptimeMinutes: monitoring?.uptimeMinutes ?? 0,
        processMemoryMb: monitoring?.processMemoryMb ?? 0,
        activeUsers: monitoring?.activeUsers ?? usersData.filter(u => u.isActive).length,
        databaseConnected: monitoring?.databaseConnected ?? false
      });

      // Generar actividad reciente basada en usuarios reales
      const activities: RecentActivity[] = [];
      
      // Logins recientes
      const recentLogins = usersData
        .filter(u => u.lastLoginAt)
        .sort((a, b) => new Date(b.lastLoginAt!).getTime() - new Date(a.lastLoginAt!).getTime())
        .slice(0, 3);

      recentLogins.forEach((u, i) => {
        activities.push({
          id: i + 1,
          action: 'Login de usuario',
          entity: `${u.firstName} ${u.lastName} (${u.email})`,
          time: formatTimeAgo(u.lastLoginAt!),
          type: 'success'
        });
      });

      // Usuarios creados recientemente
      const recentCreated = usersData
        .filter(u => u.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 2);

      recentCreated.forEach((u, i) => {
        activities.push({
          id: 100 + i,
          action: `Nuevo ${u.defaultRole || 'Usuario'} registrado`,
          entity: u.email,
          time: formatTimeAgo(u.createdAt!),
          type: 'info'
        });
      });

      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-MX');
  };

  // Estadísticas de usuarios por rol
  const roleOf = (role?: string) => (role || '').toLowerCase();
  const usersByRole = {
    superAdmins: users.filter(u => roleOf(u.defaultRole) === 'superadmin').length,
    admins: users.filter(u => roleOf(u.defaultRole) === 'admin').length,
    residents: users.filter(u => roleOf(u.defaultRole) === 'resident').length,
    others: users.filter(u => !['superadmin', 'admin', 'resident'].includes(roleOf(u.defaultRole))).length
  };

  const mainStats = [
    {
      name: 'Total Condominios',
      value: stats.totalCondominiums,
      icon: Building2,
      color: 'from-blue-500 to-cyan-500',
      change: 'Gestionar clientes',
      onClick: () => navigate('/superadmin/clients')
    },
    {
      name: 'Usuarios Totales',
      value: users.length,
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      change: `${users.filter(u => u.isActive).length} activos`,
      onClick: () => navigate('/superadmin/users')
    },
    {
      name: 'Administradores',
      value: usersByRole.admins,
      icon: Shield,
      color: 'from-green-500 to-emerald-500',
      change: `${usersByRole.superAdmins} super admins`,
      onClick: () => navigate('/superadmin/users')
    },
    {
      name: 'Residentes',
      value: usersByRole.residents,
      icon: Users,
      color: 'from-orange-500 to-red-500',
      change: 'Usuarios del sistema',
      onClick: () => navigate('/superadmin/users')
    }
  ];

  const formatUptime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  };

  const systemStats = [
    { name: 'Tiempo en línea', value: formatUptime(stats.uptimeMinutes), icon: Server, color: 'text-green-400' },
    { name: 'Memoria del proceso', value: `${stats.processMemoryMb} MB`, icon: Database, color: 'text-blue-400' },
    { name: 'Usuarios activos', value: stats.activeUsers, icon: Globe, color: 'text-purple-400' },
    { name: 'Incidencias abiertas', value: stats.openIncidents, icon: Activity, color: 'text-yellow-400' }
  ];

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (roleOf(role)) {
      case 'superadmin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'admin': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'resident': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

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
            Vista general de toda la plataforma DomusCond
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${stats.databaseConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className={`w-2 h-2 rounded-full ${stats.databaseConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className={`text-sm font-medium ${stats.databaseConnected ? 'text-green-400' : 'text-red-400'}`}>
              {stats.databaseConnected ? 'Base de datos conectada' : 'Base de datos sin conexión'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((stat) => (
          <div
            key={stat.name}
            onClick={stat.onClick}
            className="bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-700 cursor-pointer hover:border-gray-600 transition-all"
          >
            <div className={`h-1 bg-gradient-to-r ${stat.color}`}></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color} bg-opacity-20`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
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
          {recentActivity.length > 0 ? (
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
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay actividad reciente</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            Acciones Rápidas
          </h2>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/superadmin/clients')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 transition-colors"
            >
              <Building2 className="w-5 h-5" />
              <span>Gestionar Condominios</span>
            </button>
            <button 
              onClick={() => navigate('/superadmin/users')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Gestionar Usuarios</span>
            </button>
            <button
              onClick={() => navigate('/superadmin/database')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 transition-colors"
            >
              <Database className="w-5 h-5" />
              <span>Base de datos</span>
            </button>
            <button
              onClick={() => navigate('/superadmin/monitoring')}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 transition-colors"
            >
              <Server className="w-5 h-5" />
              <span>Monitoreo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Users Overview */}
      <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Usuarios Recientes
          </h2>
          <button 
            onClick={() => navigate('/superadmin/users')}
            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            Ver todos <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                <th className="pb-3 font-medium">Usuario</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Rol</th>
                <th className="pb-3 font-medium">Estado</th>
                <th className="pb-3 font-medium">Último Login</th>
                <th className="pb-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {users.slice(0, 5).map((user) => (
                <tr key={user.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <span className="font-medium text-white">{user.firstName} {user.lastName}</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-400">{user.email}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs border ${getRoleBadgeColor(user.defaultRole)}`}>
                      {user.defaultRole || 'User'}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">
                    {user.lastLoginAt ? formatTimeAgo(user.lastLoginAt) : 'Nunca'}
                  </td>
                  <td className="py-3">
                    <button 
                      onClick={() => navigate('/superadmin/users')}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay usuarios registrados</p>
          </div>
        )}
      </div>

      {/* Role Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{usersByRole.superAdmins}</p>
              <p className="text-sm text-gray-400">Super Admins</p>
            </div>
            <Crown className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{usersByRole.admins}</p>
              <p className="text-sm text-gray-400">Administradores</p>
            </div>
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{usersByRole.residents}</p>
              <p className="text-sm text-gray-400">Residentes</p>
            </div>
            <Users className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{usersByRole.others}</p>
              <p className="text-sm text-gray-400">Otros Roles</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
