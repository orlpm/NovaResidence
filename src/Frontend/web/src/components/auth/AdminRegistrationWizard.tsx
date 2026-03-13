import { useState } from 'react'
import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Modal from '../Modal'
import AdminRegistrationStep from '../onboarding/steps/AdminRegistrationStep'
import PlanSelectionStep from '../onboarding/steps/PlanSelectionStep'
import { apiClient } from '../../lib/apiClient'
import { saveAdminRegistrationData } from '../../lib/adminOnboardingFlow'
import { getApiErrorMessage } from '../../lib/apiErrors'

interface AdminRegistrationWizardProps {
  isOpen: boolean
  onClose: () => void
  initialPlan?: 'basico' | 'profesional' | 'empresarial'
  skipPlanSelection?: boolean // Nueva prop para saltar selección de plan
}

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
  selectedPlan?: 'basico' | 'profesional' | 'empresarial'
}

interface RegisterResponse {
  data?: {
    userId?: string
    token?: string
  }
  userId?: string
  token?: string
  message?: string
  errors?: string[]
}

export default function AdminRegistrationWizard({ isOpen, onClose, initialPlan, skipPlanSelection }: AdminRegistrationWizardProps) {
  const navigate = useNavigate()
  // Solo saltar selección de plan si skipPlanSelection es true explícitamente
  const shouldSkipPlan = skipPlanSelection === true
  const steps = shouldSkipPlan 
    ? [{ id: 1, title: 'Registro', description: 'Información del administrador' }]
    : [
        { id: 1, title: 'Registro', description: 'Información del administrador' },
        { id: 2, title: 'Plan', description: 'Selecciona tu plan' }
      ]
  
  const [currentStep, setCurrentStep] = useState(1)
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    admin: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      role: 'admin'
    },
    selectedPlan: initialPlan
  })

  const updateData = (data: Partial<RegistrationData>) => {
    setRegistrationData(prev => ({ ...prev, ...data }))
  }

  const handleNext = (data?: any) => {
    // Si debe saltar la selección de plan, finalizar directamente después del registro
    if (shouldSkipPlan && currentStep === 1) {
      // Si recibimos datos, usarlos directamente para evitar problemas de sincronización de estado
      if (data) {
        handleFinishWithData(data)
      } else {
        handleFinish()
      }
      return
    }
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
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

  // Versión que acepta datos directamente (para evitar problemas de sincronización de estado)
  const handleFinishWithData = async (adminData: typeof registrationData.admin) => {
    try {
      console.log('Enviando datos de registro:', adminData)
      const data = await registerAdmin(adminData)

      console.log('Usuario administrador creado:', data)
      
      saveAdminRegistrationData({
        admin: {
          email: adminData.email,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          phoneNumber: adminData.phoneNumber
        },
        selectedPlan: registrationData.selectedPlan,
        userId: data.data?.userId || data.userId
      })
      
      const token = data.data?.token ?? data.token
      if (token) {
        localStorage.setItem('auth_token', token)
      }
      
      onClose()
      
      setTimeout(() => {
        navigate('/auth/login')
      }, 300)
    } catch (error) {
      console.error('Error al crear usuario administrador:', error)
      alert(getApiErrorMessage(error, 'Hubo un error al crear tu cuenta. Por favor intenta nuevamente.'))
    }
  }

  const handleFinish = async () => {
    try {
      const data = await registerAdmin(registrationData.admin)

      console.log('Usuario administrador creado:', data)
      
      // Guardar datos en localStorage incluyendo el plan seleccionado
      saveAdminRegistrationData({
        admin: {
          email: registrationData.admin.email,
          firstName: registrationData.admin.firstName,
          lastName: registrationData.admin.lastName,
          phoneNumber: registrationData.admin.phoneNumber
        },
        selectedPlan: registrationData.selectedPlan,
        userId: data.data?.userId || data.userId
      })
      
      // Guardar token si viene en la respuesta
      const token = data.data?.token ?? data.token
      if (token) {
        localStorage.setItem('auth_token', token)
      }
      
      // Cerrar modal
      onClose()
      
      // Redirigir al login para que inicie sesión
      setTimeout(() => {
        navigate('/auth/login')
      }, 300)
    } catch (error) {
      console.error('Error al crear usuario administrador:', error)
      alert(getApiErrorMessage(error, 'Hubo un error al crear tu cuenta. Por favor intenta nuevamente.'))
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <AdminRegistrationStep
            data={registrationData.admin}
            onUpdate={(admin: any) => updateData({ admin: { ...admin, role: 'admin' } })}
            onNext={handleNext}
          />
        )
      case 2:
        return (
          <PlanSelectionStep
            selectedPlan={registrationData.selectedPlan}
            onUpdate={(selectedPlan: any) => updateData({ selectedPlan })}
            onNext={handleFinish}
            onBack={handleBack}
            onSkip={() => {
              updateData({ selectedPlan: undefined })
              handleFinish()
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-2">
            {shouldSkipPlan ? 'Comienza Gratis' : 'Crea tu cuenta'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {shouldSkipPlan 
              ? 'Registra tus datos y comienza a usar NovaResidence' 
              : 'Comienza a gestionar tu condominio de manera profesional'}
          </p>
        </div>

        {/* Progress Steps - Solo mostrar si hay más de un paso */}
        {steps.length > 1 && (
        <div className="mb-6">
          <div className="flex items-center justify-center gap-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      currentStep === step.id
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30'
                        : currentStep > step.id
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                  </div>
                  <div className="text-left">
                    <p
                      className={`text-sm font-semibold ${
                        currentStep === step.id
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">{renderStep()}</div>
      </div>
    </Modal>
  )
}
