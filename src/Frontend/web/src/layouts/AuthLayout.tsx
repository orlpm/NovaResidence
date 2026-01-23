import { Outlet, Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'

function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Background Elements */}
      <div className="fixed inset-0 bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 -z-10" />
      <div className="fixed top-20 left-10 w-72 h-72 bg-sky-400/20 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -z-10" />
      
      {/* Header with Logo */}
      <div className="py-8">
        <Link to="/" className="flex items-center justify-center space-x-3 group">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/40 group-hover:shadow-sky-500/60 transition-all duration-300 group-hover:scale-110">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-2xl font-extrabold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              NovaResidence
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Gestión de Condominios</p>
          </div>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
