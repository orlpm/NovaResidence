import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, MailCheck, MapPinned, Sparkles } from 'lucide-react'
import AdminRegistrationStep from '../../components/onboarding/steps/AdminRegistrationStep'
import PlanSelectionStep from '../../components/onboarding/steps/PlanSelectionStep'
import { apiClient } from '../../lib/apiClient'
import { saveAdminRegistrationData } from '../../lib/adminOnboardingFlow'
import { getApiErrorMessage } from '../../lib/apiErrors'

type PlanId = 'basico' | 'profesional' | 'empresarial'

interface RegistrationData {
  admin: {
    email: string
    password: string
    confirmPassword: string
    firstName: string
    lastName: string
    phoneNumber: string
    role: 'admin'
  }
  selectedPlan?: PlanId
}

interface RegisterResponse {
  data?: {
    userId?: string
    token?: string
  }
  userId?: string
  token?: string
}

const defaultRegistrationData: RegistrationData = {
  admin: {
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'admin'
  },
  selectedPlan: 'basico'
}

export default function AdminRegistrationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialPlan = (searchParams.get('plan') as PlanId | null) || 'basico'
  const skipPlanSelection = searchParams.get('skipPlan') === '1'
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    ...defaultRegistrationData,
    selectedPlan: initialPlan
  })

  const steps = useMemo(
    () => skipPlanSelection
      ? [{ id: 1, title: 'Cuenta' }]
      : [{ id: 1, title: 'Cuenta' }, { id: 2, title: 'Plan' }],
    [skipPlanSelection]
  )

  const updateData = (data: Partial<RegistrationData>) => {
    setRegistrationData((prev) => ({ ...prev, ...data }))
  }

  const registerAdmin = async (adminData: RegistrationData['admin']) => {
    const response = await apiClient.post<RegisterResponse>('/auth/register', {
      email: adminData.email,
      password: adminData.password,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      phoneNumber: adminData.phoneNumber,
      role: 'Admin',
      selectedPlan: registrationData.selectedPlan
    })

    return response.data
  }

  const handleRegistrationSuccess = async (adminData: RegistrationData['admin']) => {
    setError('')
    setLoading(true)

    try {
      const data = await registerAdmin(adminData)
      const userId = data.data?.userId || data.userId

      saveAdminRegistrationData({
        admin: {
          email: adminData.email,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          phoneNumber: adminData.phoneNumber
        },
        selectedPlan: registrationData.selectedPlan,
        userId
      })

      setSuccess(true)
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'No se pudo crear tu cuenta de administrador.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition-colors hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-sky-700 shadow-sm ring-1 ring-sky-100 dark:bg-gray-900 dark:text-sky-300 dark:ring-sky-900/50">
            <Sparkles className="h-4 w-4" />
            Alta de Administrador
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 md:p-8">
            {success ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white">Tu cuenta ya está lista</h1>
                  <p className="mt-3 text-gray-600 dark:text-gray-400">
                    Solo te faltan dos pasos: confirmar tu correo y entrar para configurar tu primer condominio.
                  </p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-5 text-left ring-1 ring-sky-100 dark:bg-sky-950/30 dark:ring-sky-900/40">
                  <p className="mb-3 text-sm font-semibold text-sky-800 dark:text-sky-200">Ruta rápida si tienes poco tiempo</p>
                  <div className="space-y-3 text-sm text-sky-900 dark:text-sky-100">
                    <div className="flex items-start gap-3"><MailCheck className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>Confirma tu correo desde el enlace que te enviamos.</span></div>
                    <div className="flex items-start gap-3"><MapPinned className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>Inicia sesión y te llevaremos directo al onboarding para dar de alta tu condominio.</span></div>
                    <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>Si interrumpes el proceso, podrás retomarlo después sin empezar desde cero.</span></div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    onClick={() => navigate(`/auth/login?email=${encodeURIComponent(registrationData.admin.email)}&next=/admin/onboarding`)}
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-sky-500/35"
                  >
                    Ir al login de administrador
                  </button>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Volver al inicio
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8 flex items-center gap-3">
                  {steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${currentStep === step.id ? 'bg-sky-500 text-white' : currentStep > step.id ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {step.id}
                      </div>
                      <span className={`text-sm font-semibold ${currentStep === step.id ? 'text-sky-700 dark:text-sky-300' : 'text-gray-500 dark:text-gray-400'}`}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                  </div>
                )}

                {currentStep === 1 ? (
                  <AdminRegistrationStep
                    data={registrationData.admin}
                    onUpdate={(admin) => updateData({ admin: { ...admin, role: 'admin' } })}
                    onNext={(adminData) => {
                      if (adminData) {
                        updateData({ admin: { ...adminData, role: 'admin' } })
                      }

                      if (skipPlanSelection) {
                        handleRegistrationSuccess({ ...(adminData || registrationData.admin), role: 'admin' })
                        return
                      }

                      setCurrentStep(2)
                    }}
                  />
                ) : (
                  <PlanSelectionStep
                    selectedPlan={registrationData.selectedPlan}
                    onUpdate={(selectedPlan) => updateData({ selectedPlan })}
                    onNext={() => handleRegistrationSuccess(registrationData.admin)}
                    onBack={() => setCurrentStep(1)}
                    onSkip={() => {
                      updateData({ selectedPlan: undefined })
                      handleRegistrationSuccess(registrationData.admin)
                    }}
                  />
                )}

                {loading && (
                  <p className="mt-4 text-center text-sm font-medium text-sky-700 dark:text-sky-300">
                    Creando tu cuenta de administrador...
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-gray-950 p-6 text-white shadow-2xl dark:bg-gray-900 md:p-8">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">Si tienes poco tiempo</p>
              <h2 className="text-3xl font-black">Haz el alta en menos de 5 minutos</h2>
              <p className="mt-3 text-sm leading-6 text-sky-50/80">
                Este flujo está pensado para administradores ocupados. Primero creas tu cuenta, luego confirmas tu correo y al entrar te llevamos directo a configurar el condominio.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800 md:p-8">
              <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Qué hace cada paso</h3>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-start gap-3"><MailCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600" /><span><strong className="text-gray-900 dark:text-white">Cuenta:</strong> crea tu usuario principal administrador para operar el sistema.</span></div>
                <div className="flex items-start gap-3"><CreditCard className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600" /><span><strong className="text-gray-900 dark:text-white">Plan:</strong> puedes elegirlo ahora o dejarlo para después; el sistema te dejará iniciar con prueba gratis cuando aplique.</span></div>
                <div className="flex items-start gap-3"><MapPinned className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600" /><span><strong className="text-gray-900 dark:text-white">Onboarding:</strong> al entrar registrarás nombre del condominio, edificios, unidades e invitaciones iniciales.</span></div>
                <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600" /><span><strong className="text-gray-900 dark:text-white">Alta incompleta:</strong> si te interrumpen, guardaremos tu progreso para retomarlo luego.</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}