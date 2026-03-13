import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '../../lib/authService'
import { getPostLoginRoute } from '../../lib/adminOnboardingFlow'
import { getApiErrorCode, getApiErrorMessage } from '../../lib/apiErrors'

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const [confirmationPendingEmail, setConfirmationPendingEmail] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  useEffect(() => {
    const email = searchParams.get('email')
    if (email) {
      setFormData((current) => ({ ...current, email }))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.password) {
      toast.error('Por favor ingresa email y contraseña')
      return
    }

    setLoading(true)

    try {
      const user = await login(formData.email, formData.password)
      toast.success('¡Bienvenido!')

      navigate(getPostLoginRoute(user, searchParams.get('next')))
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = getApiErrorMessage(error, 'Error al iniciar sesión')
      const errorCode = getApiErrorCode(error) || ((error as { code?: string })?.code)

      if (errorCode === 'EMAIL_NOT_CONFIRMED') {
        setConfirmationPendingEmail(formData.email.trim())
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!confirmationPendingEmail) {
      toast.error('No hay un correo pendiente para reenviar')
      return
    }

    setResendingConfirmation(true)
    try {
      const response = await authService.resendEmailConfirmation(confirmationPendingEmail)
      toast.success(response.message || 'Te enviamos un nuevo enlace de confirmación')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo reenviar el correo de confirmación'))
    } finally {
      setResendingConfirmation(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
      <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white mb-2">
        Iniciar Sesión
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        Ingresa a tu cuenta de NovaResidence
      </p>

      {searchParams.get('next') === '/admin/onboarding' && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
          <p className="font-semibold mb-1">Acceso rápido para administradores</p>
          <p>Después de iniciar sesión te llevaremos directo al onboarding para terminar el alta de tu condominio.</p>
        </div>
      )}

      {!searchParams.get('next') && confirmationPendingEmail === '' && formData.email === '' && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <p className="font-semibold mb-1">¿Administras un condominio y vas con poco tiempo?</p>
          <p>Usa la ruta de alta dedicada para crear tu cuenta, confirmar correo y seguir directo al onboarding.</p>
          <Link to="/alta-administrador" className="mt-3 inline-flex font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300">
            Ir a Alta de Administrador
          </Link>
        </div>
      )}

      {confirmationPendingEmail && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold mb-1">Tu correo aún no está confirmado</p>
          <p className="mb-3 break-all">Debes validar <span className="font-semibold">{confirmationPendingEmail}</span> antes de iniciar sesión.</p>
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resendingConfirmation}
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {resendingConfirmation ? 'Reenviando...' : 'Reenviar correo de confirmación'}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="off"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Recordarme
            </label>
          </div>

          <div className="text-sm">
            <Link to="/auth/forgot-password" className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Iniciando sesión...
            </span>
          ) : (
            <>
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ¿Eres administrador?{' '}
          <Link to="/alta-administrador" className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 transition-colors">
            Alta de Administrador
          </Link>
        </p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          ¿Eres residente?{' '}
          <Link to="/auth/register" className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 transition-colors">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
