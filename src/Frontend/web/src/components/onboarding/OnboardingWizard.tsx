import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import Modal from '../Modal'
import CondominiumInfoStep from './steps/CondominiumInfoStep'
import BuildingTypeStep from './steps/BuildingTypeStep'
import UnitsSetupStep from './steps/UnitsSetupStep'
import ResidentInvitationStep from './steps/ResidentInvitationStep'
import { condominiumService } from '../../lib/condominiumService'
import { useAuthStore } from '../../stores/authStore'
import { clearOnboardingState, saveOnboardingState } from '../../lib/onboardingStorage'
import { getApiErrorMessage } from '../../lib/apiErrors'
import type { OnboardingData } from '../../types/onboarding'

interface OnboardingWizardProps {
  isOpen?: boolean
  onClose?: () => void
  onComplete?: (data: OnboardingData) => void
  initialPlan?: 'basico' | 'profesional' | 'empresarial'
  isEmbedded?: boolean
  initialData?: OnboardingData
  initialStep?: number
}

const steps = [
  { id: 1, title: 'Condominio', description: 'Datos del condominio' },
  { id: 2, title: 'Edificios', description: 'Tipo y configuración' },
  { id: 3, title: 'Unidades', description: 'Detalle de viviendas' },
  { id: 4, title: 'Residentes', description: 'Invitar residentes' }
]

const defaultOnboardingData: OnboardingData = {
  condominium: {
    name: '',
    address: '',
    city: '',
    state: '',
    stateId: '',
    zipCode: '',
    country: 'México',
    countryId: '',
    sections: []
  },
  buildingTypes: {
    vertical: false,
    horizontal: false
  },
  buildings: [],
  invitationMethod: 'link',
  residents: []
}

export default function OnboardingWizard({ isOpen = true, onClose, onComplete, initialPlan: _initialPlan, isEmbedded = false, initialData, initialStep = 1 }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { user } = useAuthStore()
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    ...defaultOnboardingData,
    ...initialData,
    condominium: {
      ...defaultOnboardingData.condominium,
      ...initialData?.condominium
    },
    buildingTypes: {
      ...defaultOnboardingData.buildingTypes,
      ...initialData?.buildingTypes
    },
    buildings: initialData?.buildings ?? defaultOnboardingData.buildings,
    invitationMethod: initialData?.invitationMethod ?? defaultOnboardingData.invitationMethod,
    residents: initialData?.residents ?? defaultOnboardingData.residents
  })

  useEffect(() => {
    setCurrentStep(initialStep)
  }, [initialStep])

  useEffect(() => {
    if (!initialData) return

    setOnboardingData({
      ...defaultOnboardingData,
      ...initialData,
      condominium: {
        ...defaultOnboardingData.condominium,
        ...initialData.condominium
      },
      buildingTypes: {
        ...defaultOnboardingData.buildingTypes,
        ...initialData.buildingTypes
      },
      buildings: initialData.buildings ?? defaultOnboardingData.buildings,
      invitationMethod: initialData.invitationMethod ?? defaultOnboardingData.invitationMethod,
      residents: initialData.residents ?? defaultOnboardingData.residents
    })
  }, [initialData])

  useEffect(() => {
    saveOnboardingState({
      currentStep,
      data: onboardingData,
      userId: user?.id
    })
  }, [currentStep, onboardingData, user?.id])

  const updateData = (stepData: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...stepData }))
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      // Get user ID from auth store
      const userId = user?.id || ''
      
      console.log('Creating condominium with data:', onboardingData)
      
      // Call the backend to create the condominium with all buildings and units
      const result = await condominiumService.createFromWizardData(onboardingData, userId)
      
      console.log('Condominium created successfully:', result)
      
      // Store wizard data in localStorage for backward compatibility
      saveOnboardingState({
        currentStep: steps.length,
        data: {
          ...onboardingData,
          condominiumId: result.condominiumId
        } as OnboardingData,
        userId
      })
      clearOnboardingState()
      
      if (onComplete) {
        onComplete(onboardingData)
      } else if (onClose) {
        onClose()
      }
    } catch (error: any) {
      console.error('Error creating condominium:', error)
      setSubmitError(getApiErrorMessage(error, 'Error al crear el condominio. Por favor intente nuevamente.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CondominiumInfoStep
            data={onboardingData.condominium}
            onUpdate={(condominium: any) => updateData({ condominium })}
            onNext={handleNext}
            onBack={currentStep > 1 ? handleBack : undefined}
          />
        )
      case 2:
        return (
          <BuildingTypeStep
            data={onboardingData.buildingTypes}
            sections={onboardingData.condominium?.sections || []}
            onUpdate={(buildingTypes: any) => updateData({ buildingTypes })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      case 3:
        return (
          <UnitsSetupStep
            buildingTypes={onboardingData.buildingTypes}
            sections={onboardingData.condominium?.sections || []}
            buildings={onboardingData.buildings}
            onUpdate={(buildings: any) => updateData({ buildings })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      case 4:
        return (
          <ResidentInvitationStep
            buildings={onboardingData.buildings || []}
            invitationMethod={onboardingData.invitationMethod}
            residents={onboardingData.residents}
            onUpdate={(data: any) => updateData(data)}
            onFinish={handleFinish}
            onBack={handleBack}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )
      default:
        return null
    }
  }

  const content = (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-1 relative min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all flex-shrink-0 ${
                    currentStep === step.id
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30'
                      : currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : step.id}
                </div>
                <div className="hidden lg:block min-w-0 flex-1">
                  <p
                    className={`text-xs font-semibold truncate ${
                      currentStep === step.id
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-4 md:top-5 left-8 md:left-10 right-0 h-0.5 -z-10 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">{renderStep()}</div>
    </div>
  )

  if (isEmbedded) {
    return content
  }

  return (
    <Modal isOpen={isOpen || false} onClose={onClose || (() => {})} title="" maxWidth="4xl">
      {content}
    </Modal>
  )
}

