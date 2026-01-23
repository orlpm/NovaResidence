import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Home,
  CreditCard,
  Calendar,
  AlertCircle,
  Menu,
  X,
  LogOut,
  Settings,
  Bell,
  Sun,
  Moon,
  Building2
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../contexts/ThemeContext'

const navigation = [
  { name: 'Dashboard', href: '/resident', icon: LayoutDashboard },
  { name: 'Mi Unidad', href: '/resident/my-unit', icon: Home },
  { name: 'Pagos', href: '/resident/payments', icon: CreditCard },
  { name: 'Reservaciones', href: '/resident/reservations', icon: Calendar },
  { name: 'Incidencias', href: '/resident/incidents', icon: AlertCircle },
]

function ResidentLayout() {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50">
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
                <p className="text-xs text-gray-500 dark:text-gray-400">Portal Residente</p>
              </div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col px-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/resident'}
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
                            isActive ? 'text-white' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-brand-600 dark:group-hover:text-brand-400'
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
          
          <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center space-x-3 px-3 py-2">
              <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
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
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">
            <div className="flex h-16 items-center justify-between px-6 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-brand p-2 rounded-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-brand bg-clip-text text-transparent">
                  NovaResidence
                </span>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6 text-neutral-500" />
              </button>
            </div>
            <nav className="px-4 mt-4">
              <ul role="list" className="space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      end={item.href === '/resident'}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `group flex gap-x-3 rounded-lg p-3 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-brand text-white'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={`h-5 w-5 ${
                              isActive ? 'text-white' : 'text-neutral-500 dark:text-neutral-400'
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

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-lg px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="lg:hidden -m-2.5 p-2.5 text-neutral-700 dark:text-neutral-300"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Portal del Residente
              </h1>
            </div>

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button
                onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
              >
                {effectiveTheme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              <button className="relative p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white font-semibold text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-soft-lg border border-neutral-200 dark:border-neutral-700 py-1">
                    <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700"
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

        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ResidentLayout
