import { useState, useEffect, useRef } from 'react'
import { Building2, LogIn, UserPlus, Menu, X, Sun, Moon, LogOut, Settings, LayoutDashboard, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate, Link } from 'react-router-dom'
import LoginModal from './LoginModal'

export default function Navbar() {
  const [showLogin, setShowLogin] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  
  const { user, isAuthenticated, logout } = useAuthStore()
  const { effectiveTheme, setTheme } = useTheme()
  const navigate = useNavigate()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  const getDashboardLink = () => {
    if (user?.role === 'admin') return '/admin'
    return '/resident'
  }

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-sky-500/10' 
          : 'bg-white dark:bg-gray-900'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-20">
            {/* Logo */}
            <Link to="/" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }} className="flex items-center space-x-2 sm:space-x-3 group min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/40 group-hover:shadow-sky-500/60 transition-all duration-300 group-hover:scale-110 flex-shrink-0">
                <Building2 className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-lg sm:text-2xl font-extrabold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent block truncate">
                  DomusCond
                </span>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium hidden xs:block">Gestión de Condominios</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <a href="#features" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 font-semibold transition-all duration-300 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 cursor-pointer">
                Características
              </a>
              <a href="#pricing" onClick={(e) => { e.preventDefault(); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 font-semibold transition-all duration-300 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 cursor-pointer">
                Precios
              </a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 font-semibold transition-all duration-300 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-900/20 cursor-pointer">
                Contacto
              </a>
            </div>

            {/* Right side */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-all duration-300 hover:scale-110"
                aria-label="Toggle theme"
              >
                {effectiveTheme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {isAuthenticated && user ? (
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-3 p-2 pr-4 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 hover:from-sky-100 hover:to-blue-100 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-300 border border-sky-200/50 dark:border-gray-600"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-sky-500/30">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {user.firstName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user.role || 'Usuario'}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-black/50 border border-gray-100 dark:border-gray-700 overflow-hidden">
                      <div className="p-4 bg-gradient-to-r from-sky-500 to-blue-600">
                        <p className="font-bold text-white text-lg">{user.firstName} {user.lastName}</p>
                        <p className="text-sky-100 text-sm truncate">{user.email}</p>
                      </div>
                      
                      <div className="p-2">
                        <Link
                          to={getDashboardLink()}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl transition-all font-medium"
                        >
                          <LayoutDashboard className="w-5 h-5 text-sky-500" />
                          <span>Mi Dashboard</span>
                        </Link>
                        <button
                          className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl transition-all font-medium"
                        >
                          <Settings className="w-5 h-5 text-gray-400" />
                          <span>Configuración</span>
                        </button>
                      </div>
                      
                      <div className="border-t border-gray-100 dark:border-gray-700 p-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all font-medium"
                        >
                          <LogOut className="w-5 h-5" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowLogin(true)}
                    className="flex items-center space-x-2 px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-400 font-semibold transition-all duration-300"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Iniciar Sesión</span>
                  </button>
                  <button
                    onClick={() => navigate('/alta-administrador')}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-105 transition-all duration-300"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Alta de Administrador</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
              <button
                onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-800"
                aria-label="Toggle theme"
              >
                {effectiveTheme === 'dark' ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-800"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300" />
                ) : (
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-2xl">
            <div className="px-3 sm:px-4 py-4 sm:py-6 space-y-1.5 sm:space-y-2 max-h-[70vh] overflow-y-auto">
              <a
                href="#features"
                onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="block px-4 py-2.5 sm:py-3 text-gray-700 dark:text-gray-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl font-semibold text-sm sm:text-base"
              >
                Características
              </a>
              <a
                href="#pricing"
                onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="block px-4 py-2.5 sm:py-3 text-gray-700 dark:text-gray-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl font-semibold text-sm sm:text-base"
              >
                Precios
              </a>
              <a
                href="#contact"
                onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="block px-4 py-2.5 sm:py-3 text-gray-700 dark:text-gray-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl font-semibold text-sm sm:text-base"
              >
                Contacto
              </a>
              
              <div className="pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2.5 sm:space-y-3">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center space-x-3 px-4 py-2 mb-2">
                      <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <Link
                      to={getDashboardLink()}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center px-5 py-2.5 sm:py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg text-sm sm:text-base"
                    >
                      Mi Dashboard
                    </Link>
                    <button
                      onClick={async () => { await handleLogout(); setMobileMenuOpen(false); }}
                      className="w-full px-5 py-2.5 sm:py-3 border-2 border-red-500 text-red-500 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 text-sm sm:text-base"
                    >
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }}
                      className="w-full px-5 py-2.5 sm:py-3 border-2 border-sky-500 text-sky-600 dark:text-sky-400 rounded-xl font-semibold hover:bg-sky-50 dark:hover:bg-sky-900/20 text-sm sm:text-base"
                    >
                      Iniciar Sesión
                    </button>
                    <button
                      onClick={() => { navigate('/alta-administrador'); setMobileMenuOpen(false); }}
                      className="w-full px-5 py-2.5 sm:py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg text-sm sm:text-base"
                    >
                      Alta de Administrador
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Modals */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => {
          setShowLogin(false)
          navigate('/auth/register')
        }}
      />
    </>
  )
}
