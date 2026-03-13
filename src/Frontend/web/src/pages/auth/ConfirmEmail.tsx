import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MailCheck, RefreshCw } from 'lucide-react'
import { authService } from '../../lib/authService'
import { getAdminRegistrationData } from '../../lib/adminOnboardingFlow'
import { getApiErrorMessage } from '../../lib/apiErrors'

type Status = 'loading' | 'success' | 'error'

function sameUserId(left?: string, right?: string) {
  if (!left || !right) {
    return false
  }

  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('Validando enlace...')

  const userId = searchParams.get('userId') || ''
  const token = searchParams.get('token') || ''
  const adminRegistration = useMemo(() => getAdminRegistrationData(), [])
  const isAdminRegistrationFlow = sameUserId(adminRegistration?.userId, userId)
  const adminLoginTarget = isAdminRegistrationFlow
    ? `/auth/login?email=${encodeURIComponent(adminRegistration?.admin?.email || '')}&next=/admin/onboarding`
    : '/auth/login'

  useEffect(() => {
    const run = async () => {
      if (!userId || !token) {
        setStatus('error')
        setMessage('El enlace de validación es inválido.')
        return
      }

      try {
        const response = await authService.confirmEmail(userId, token)
        setStatus('success')
        setMessage(response.message || 'Tu correo fue confirmado correctamente.')
      } catch (error) {
        setStatus('error')
        setMessage(getApiErrorMessage(error, 'No fue posible validar tu correo.'))
      }
    }

    run()
  }, [token, userId])

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mb-5">
        {status === 'loading' ? <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" /> : <MailCheck className="w-8 h-8 text-sky-600" />}
      </div>

      <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Confirmación de Correo</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">{message}</p>

      {status === 'success' && isAdminRegistrationFlow && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-left text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
          <p className="font-semibold mb-1">Siguiente paso recomendado</p>
          <p>Inicia sesión y te llevaremos directo al onboarding para terminar el alta de tu condominio sin perder tiempo.</p>
        </div>
      )}

      <Link
        to={adminLoginTarget}
        className="inline-flex items-center justify-center py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold text-base shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all duration-300"
      >
        {isAdminRegistrationFlow ? 'Ir a configurar mi condominio' : 'Ir a iniciar sesión'}
      </Link>
    </div>
  )
}