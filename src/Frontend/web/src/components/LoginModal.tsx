import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import Modal from './Modal'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToRegister: () => void
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuthData = useAuthStore((state) => state.setAuthData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('https://localhost:7001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.Message || data.errors?.[0] || 'Credenciales inválidas')
      }

      // Extraer datos de la respuesta (manejar tanto camelCase como PascalCase)
      const accessToken = data.accessToken || data.AccessToken || data.token || data.Token
      const refreshToken = data.refreshToken || data.RefreshToken
      const userFromResponse = data.user || data.User
      
      const userData = userFromResponse ? {
        id: userFromResponse.id || userFromResponse.Id || '1',
        email: userFromResponse.email || userFromResponse.Email || email,
        firstName: userFromResponse.firstName || userFromResponse.FirstName || email.split('@')[0],
        lastName: userFromResponse.lastName || userFromResponse.LastName || '',
        role: (userFromResponse.role || userFromResponse.Role || 'admin').toLowerCase() as 'admin' | 'resident' | 'provider',
      } : {
        id: '1',
        email: email,
        firstName: email.split('@')[0],
        lastName: '',
        role: 'admin' as const,
      }

      // Guardar en el store (esto también persiste en localStorage)
      setAuthData(userData, accessToken, refreshToken)

      onClose()
      // Navegar según el rol del usuario
      if (userData.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/resident')
      }
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Iniciar Sesión">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-sky-600 focus:ring-sky-500" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Recordarme</span>
          </label>
          <button type="button" className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium">
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white py-3.5 px-6 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-sky-500/30 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿No tienes una cuenta?{' '}
            <button
              type="button"
              onClick={() => {
                handleClose()
                onSwitchToRegister()
              }}
              className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-semibold"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </form>
    </Modal>
  )
}
