import { useState, useEffect } from 'react'
import { ChevronLeft, CheckCircle2, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import OnboardingWizard from '../../components/onboarding/OnboardingWizard'
import type { OnboardingData } from '../../types/onboarding'

export default function AdminOnboarding() {
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(true)
  const [wizardData, setWizardData] = useState<OnboardingData | null>(null)
  const [completionPercentage, setCompletionPercentage] = useState(0)

  // Load saved wizard data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('onboarding_wizard_data')
    if (savedData) {
      const data = JSON.parse(savedData)
      setWizardData(data)
      calculateCompletion(data)
    }
  }, [])

  const calculateCompletion = (data: OnboardingData) => {
    let completed = 0
    let total = 4

    if (data.condominium?.name) completed++
    if (data.buildingTypes && (data.buildingTypes.vertical || data.buildingTypes.horizontal)) completed++
    if (data.buildings && data.buildings.length > 0) completed++
    if (data.invitationMethod) completed++

    setCompletionPercentage(Math.round((completed / total) * 100))
  }

  const handleWizardComplete = (data: OnboardingData) => {
    setWizardData(data)
    calculateCompletion(data)
    localStorage.setItem('onboarding_wizard_data', JSON.stringify(data))
    
    // After 2 seconds, redirect to dashboard
    setTimeout(() => {
      navigate('/admin/dashboard', { state: { onboardingComplete: true } })
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header with back button */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Volver al Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Section */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                Configuración del Condominio
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Completa los pasos para configurar tu condominio y comenzar a gestionar residentes
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-sky-600">{completionPercentage}%</div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Completado</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Wizard Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
          {/* Expandable Header */}
          <div
            className="bg-gradient-to-r from-sky-500 to-blue-600 p-6 cursor-pointer hover:shadow-md transition-all"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  {completionPercentage === 100 ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {completionPercentage === 100 ? '¡Configuración Completada!' : 'Asistente de Configuración'}
                  </h2>
                  <p className="text-sky-100 text-sm mt-1">
                    {completionPercentage === 100
                      ? 'Tu condominio está listo para usar'
                      : `Paso ${wizardData ? Object.values(wizardData).filter(v => v).length : 0} de 6`}
                  </p>
                </div>
              </div>
              <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </div>

          {/* Wizard Content */}
          {isExpanded && (
            <div className="p-6 animate-in fade-in-50 duration-300">
              <OnboardingWizard
                onComplete={handleWizardComplete}
                isEmbedded={true}
              />
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Tu Información</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Proporciona tus datos como administrador del condominio
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                <span className="text-sky-600 dark:text-sky-400 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Tu Condominio</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Configura los detalles y características de tu condominio
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Residentes</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Invita a los primeros residentes a usar la plataforma
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
