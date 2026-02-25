import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  Menu, X, Sun, Moon, LogOut, Shield, Crown,
  LayoutDashboard, Building2, Users,
  Lock, Activity, Server, Database, CreditCard
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { NotificationBell } from '../components/NotificationBell';
import { PermissionGate } from '../components/shared/PermissionGate';
import { PERMISSIONS } from '../config/permissions';
import { useBackgroundPattern } from '../components/BackgroundPattern';

export default function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { effectiveTheme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard },
    { 
      name: 'Clientes', 
      href: '/superadmin/clients', 
      icon: Building2,
      permission: PERMISSIONS.PLATFORM_MANAGE_CLIENTS
    },
    { 
      name: 'Usuarios', 
      href: '/superadmin/users', 
      icon: Users,
      permission: PERMISSIONS.PLATFORM_VIEW_ALL_DATA
    },
    {
      name: 'Personal Operativo',
      href: '/superadmin/staff',
      icon: Shield,
      permission: PERMISSIONS.PLATFORM_VIEW_ALL_DATA
    },
    { 
      name: 'Permisos', 
      href: '/superadmin/permissions', 
      icon: Lock,
      permission: PERMISSIONS.PLATFORM_MANAGE_PERMISSIONS
    },
    { 
      name: 'Roles', 
      href: '/superadmin/roles', 
      icon: Shield,
      permission: PERMISSIONS.PLATFORM_MANAGE_ROLES
    },
    { 
      name: 'Suscripciones', 
      href: '/superadmin/subscriptions', 
      icon: CreditCard,
      permission: PERMISSIONS.PLATFORM_MANAGE_CLIENTS
    },
    { 
      name: 'Monitoreo', 
      href: '/superadmin/monitoring', 
      icon: Activity
    },
    { 
      name: 'Sistema', 
      href: '/superadmin/system', 
      icon: Server,
      permission: PERMISSIONS.PLATFORM_SYSTEM_SETTINGS
    },
    { 
      name: 'Base de Datos', 
      href: '/superadmin/database', 
      icon: Database,
      permission: PERMISSIONS.PLATFORM_SYSTEM_SETTINGS
    }
  ];

  const bgPattern = useBackgroundPattern('superadmin');

  return (
    <div className="min-h-screen bg-gray-900 overflow-x-hidden" style={bgPattern}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-900 via-purple-800 to-indigo-900 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-purple-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg">
                <Crown className="w-6 h-6 text-purple-900" />
              </div>
              <div>
                <span className="text-lg font-bold text-white">NovaResidence</span>
                <p className="text-xs text-purple-300">Super Admin</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-purple-300 hover:bg-purple-700/50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const NavItem = (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-yellow-400/20 to-amber-500/20 text-yellow-400 border border-yellow-400/30'
                      : 'text-purple-200 hover:bg-purple-700/50 hover:text-white'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-yellow-400' : ''}`} />
                  {item.name}
                </Link>
              );

              if (item.permission) {
                return (
                  <PermissionGate key={item.name} permissions={item.permission}>
                    {NavItem}
                  </PermissionGate>
                );
              }

              return NavItem;
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-purple-700/50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 flex items-center justify-center text-purple-900 font-bold shadow-lg">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-yellow-400 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Super Administrador
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : ''}`}>
        {/* Header */}
        <header className="h-16 bg-gray-800 shadow-lg border-b border-gray-700">
          <div className="h-full px-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400/10 to-amber-500/10 border border-yellow-400/30">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Modo Super Admin</span>
              </div>

              <NotificationBell condominiumId={undefined} />
              
              <button
                onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                {effectiveTheme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={logout}
                className="p-2 rounded-lg text-red-400 hover:bg-red-900/30"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 bg-gray-900 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
