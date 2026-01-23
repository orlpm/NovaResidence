import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  CreditCard,
  AlertCircle,
  FileText,
  Menu,
  X,
  LogOut,
  Settings,
  Bell,
  Sun,
  Moon
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../contexts/ThemeContext'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Condominios', href: '/admin/condominiums', icon: Building2 },
  { name: 'Unidades', href: '/admin/units', icon: Home },
  { name: 'Residentes', href: '/admin/residents', icon: Users },
  { name: 'Facturación', href: '/admin/billing', icon: CreditCard },
  { name: 'Incidencias', href: '/admin/incidents', icon: AlertCircle },
  { name: 'Reportes', href: '/admin/reports', icon: FileText },
]

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const { effectiveTheme, setTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-6 overflow-y-auto bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-lg shadow-sky-500/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                  NovaResidence
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Panel Admin</p>
              </div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col px-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/admin'}
                    className={({ isActive }) =>
                      `group flex gap-x-3 rounded-xl p-3 text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`h-5 w-5 shrink-0 ${
                            isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-sky-600 dark:group-hover:text-sky-400'
                          }`}
                        />
                        {item.name}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center space-x-3 px-3 py-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md shadow-sky-500/30">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl">
            <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 shadow-lg shadow-sky-500/30">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                  NovaResidence
                </span>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <nav className="px-4 mt-4">
              <ul role="list" className="space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      end={item.href === '/admin'}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `group flex gap-x-3 rounded-xl p-3 text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={`h-5 w-5 ${
                              isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                            }`}
                          />
                          {item.name}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}

      <div className="lg:pl-72 flex flex-col min-h-screen">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="lg:hidden -m-2.5 p-2.5 text-gray-700 dark:text-gray-300"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Panel de Administración
              </h1>
            </div>

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button
                onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                {effectiveTheme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              <button className="relative p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-sky-500/30">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-xl shadow-sky-500/10 border border-gray-200 dark:border-gray-800 py-1">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Configuración</span>
                    </button>
                    
                    <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
