import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '../../lib/authService'
import { getApiErrorMessage } from '../../lib/apiErrors'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Ingresa tu correo')
      return
    }

    setLoading(true)
    try {
      const response = await authService.forgotPassword(email.trim())
      toast.success(response.message || response.Message || 'Revisa tu correo')
      setSubmitted(true)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo procesar la solicitud'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
      <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white mb-2">Recuperar Contraseña</h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        {submitted ? 'Si el correo existe, te enviamos un enlace para restablecerla.' : 'Te enviaremos un enlace para crear una nueva contraseña.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Correo Electrónico</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 disabled:opacity-50 transition-all duration-300"
        >
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )
}