import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail, Lock, User, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '../../lib/authService'
import { getApiErrorMessage } from '../../lib/apiErrors'

function Register() {
  const [loading, setLoading] = useState(false)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast.error('Completa los campos obligatorios')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/.test(formData.password)) {
      toast.error('La contraseña necesita al menos 8 caracteres, con mayúscula, minúscula, número y un símbolo')
      return
    }

    setLoading(true)

    try {
      await authService.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        password: formData.password,
        role: 'Resident'
      })

      setRegisteredEmail(formData.email.trim())
      toast.success('Registro completado. Revisa tu correo para validar tu cuenta.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo completar el registro'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!registeredEmail) {
      return
    }

    setResendingConfirmation(true)
    try {
      const response = await authService.resendEmailConfirmation(registeredEmail)
      toast.success(response.message || 'Te enviamos un nuevo enlace de confirmación')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo reenviar el correo de confirmación'))
    } finally {
      setResendingConfirmation(false)
    }
  }

  if (registeredEmail) {
    return (
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
        <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white mb-3">Revisa tu correo</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Enviamos un enlace de confirmación a <span className="font-semibold text-gray-900 dark:text-white">{registeredEmail}</span>.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Debes validar tu correo para completar el alta de tu cuenta de residente.
        </p>
        <button
          type="button"
          onClick={handleResendConfirmation}
          disabled={resendingConfirmation}
          className="w-full mb-3 inline-flex items-center justify-center gap-2 py-3 px-4 border border-sky-200 bg-sky-50 text-sky-700 rounded-xl font-bold text-base hover:bg-sky-100 disabled:opacity-50 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300"
        >
          {resendingConfirmation ? 'Reenviando confirmación...' : 'Reenviar correo de confirmación'}
        </button>
        <Link
          to="/auth/login"
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all duration-300"
        >
          Ir a iniciar sesión
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
      <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white mb-2">Registro de Residente</h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Accede a tu unidad, pagos, visitas y reservaciones.</p>

      <div className="mb-8 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
        <p className="font-semibold mb-1">¿Administras un condominio?</p>
        <p>
          Para alta de cliente y configuración inicial usa la ruta de{' '}
          <Link to="/alta-administrador" className="font-semibold text-sky-700 underline-offset-4 hover:underline dark:text-sky-300">
            Alta de Administrador
          </Link>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nombre</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Nombre"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Apellido</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Apellido"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Correo Electrónico</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Teléfono</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="5512345678"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Contraseña</label>
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
          className="group w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ¿Ya tienes cuenta?{' '}
          <Link to="/auth/login" className="font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
