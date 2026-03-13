import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '../../lib/authService'
import { getApiErrorMessage } from '../../lib/apiErrors'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' })

  const userId = searchParams.get('userId') || ''
  const token = searchParams.get('token') || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId || !token) {
      toast.error('El enlace es inválido')
      return
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const response = await authService.resetPassword(userId, token, formData.password)
      toast.success(response.message || 'Contraseña actualizada')
      setDone(true)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar la contraseña'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
      <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white mb-2">Nueva Contraseña</h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        {done ? 'Tu contraseña se actualizó correctamente.' : 'Define una nueva contraseña para tu cuenta.'}
      </p>

      {!done ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Minimo 6 caracteres"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Confirmar Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Repite tu contraseña"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 disabled:opacity-50 transition-all duration-300"
          >
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      ) : (
        <Link
          to="/auth/login"
          className="w-full inline-flex items-center justify-center py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all duration-300"
        >
          Ir a iniciar sesión
        </Link>
      )}
    </div>
  )
}