import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  Menu, X, Sun, Moon, LogOut, Shield,
  LayoutDashboard, ClipboardList, Users, AlertCircle, ShieldCheck, Camera
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { NotificationBell } from '../components/NotificationBell';
import { PermissionGate } from '../components/shared/PermissionGate';
import { PERMISSIONS } from '../config/permissions';
import { useBackgroundPattern } from '../components/BackgroundPattern';

export default function SecurityLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/security/dashboard', icon: LayoutDashboard },
    { 
      name: 'Registro de Accesos', 
      href: '/security/access-log', 
      icon: ClipboardList,
      permission: PERMISSIONS.SECURITY_VIEW_ACCESS_LOG
    },
    { 
      name: 'Visitantes', 
      href: '/security/visitors', 
      icon: Users,
      permission: PERMISSIONS.SECURITY_MANAGE_VISITORS
    },
    {
      name: 'Control de Accesos',
      href: '/security/access-control',
      icon: ShieldCheck,
      permission: PERMISSIONS.SECURITY_MANAGE_ACCESS_CONTROL
    },
    {
      name: 'Cámaras',
      href: '/security/cameras',
      icon: Camera,
      permission: PERMISSIONS.SECURITY_VIEW_CAMERAS
    },
    { 
      name: 'Incidencias', 
      href: '/security/incidents', 
      icon: AlertCircle,
      permission: PERMISSIONS.INCIDENTS_CREATE
    }
  ];

  const bgPattern = useBackgroundPattern('security');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden" style={bgPattern}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-orange-600" />
              <span className="text-xl font-bold text-orange-600">Vigilancia</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const NavItem = (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
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

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-orange-600">Vigilancia</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : ''}`}>
        <header className="h-16 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="h-full px-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>

            <div className="flex items-center space-x-4">
              <NotificationBell />
              <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
