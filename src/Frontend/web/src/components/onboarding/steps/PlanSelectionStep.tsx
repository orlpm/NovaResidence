import { useState } from 'react'
import { Check, Zap, Star, Crown, ChevronLeft, Clock } from 'lucide-react'

interface PlanSelectionStepProps {
  selectedPlan?: 'basico' | 'profesional' | 'empresarial'
  onUpdate: (plan: 'basico' | 'profesional' | 'empresarial') => void
  onNext: () => void
  onBack: () => void
  onSkip?: () => void
}

const plans = [
  {
    id: 'basico' as const,
    name: 'Básico',
    icon: Zap,
    price: '$49',
    period: '/unidad/mes',
    description: 'Ideal para condominios pequeños de 1 a 20 unidades',
    features: [
      '1 a 20 unidades',
      'Gestión de residentes',
      'Cobros y pagos',
      'Incidencias básicas',
      'Soporte por email',
      '1 administrador'
    ],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'profesional' as const,
    name: 'Profesional',
    icon: Star,
    price: '$39',
    period: '/unidad/mes',
    description: 'Para condominios medianos de 21 a 100 unidades',
    features: [
      '21 a 100 unidades',
      'Todo lo del plan Básico',
      'Reportes avanzados',
      'Comunicaciones y encuestas',
      'Reserva de amenidades',
      '3 administradores',
      'Soporte prioritario'
    ],
    color: 'from-sky-500 to-blue-600',
    popular: true
  },
  {
    id: 'empresarial' as const,
    name: 'Empresarial',
    icon: Crown,
    price: '$29',
    period: '/unidad/mes',
    description: 'Para desarrollos grandes de 101 a 500 unidades',
    features: [
      '101 a 500 unidades',
      'Todo lo del plan Profesional',
      'Integraciones avanzadas',
      'Multi-condominio',
      'API personalizada',
      'Administradores ilimitados',
      'Soporte 24/7',
      'Capacitación incluida'
    ],
    color: 'from-purple-500 to-pink-500'
  }
]

export default function PlanSelectionStep({ selectedPlan, onUpdate, onNext, onBack, onSkip }: PlanSelectionStepProps) {
  const [selected, setSelected] = useState(selectedPlan)

  const handleSelect = (planId: 'basico' | 'profesional' | 'empresarial') => {
    setSelected(planId)
    onUpdate(planId)
  }

  const handleContinue = () => {
    onNext()
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Selecciona tu Plan
        </h3>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Elige el plan que mejor se adapte al tamaño de tu condominio. Los precios mostrados son por unidad al mes y puedes cambiar de plan más adelante.
        </p>
      </div>

      {/* Opción de seleccionar después */}
      {onSkip && (
        <div className="flex justify-center">
          <button
            onClick={onSkip}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          >
            <Clock className="w-5 h-5" />
            <span>Seleccionar plan más tarde</span>
          </button>
        </div>
      )}

      {/* Grid de planes - más ancho con mejor espaciado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon
          const isSelected = selected === plan.id

          return (
            <div
              key={plan.id}
              onClick={() => handleSelect(plan.id)}
              className={`relative p-6 lg:p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col ${
                isSelected
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 shadow-xl shadow-sky-500/20 scale-[1.02]'
                  : plan.popular
                  ? 'border-sky-300 dark:border-sky-700 hover:border-sky-400 dark:hover:border-sky-600 bg-white dark:bg-gray-800'
                  : 'border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-700 bg-white dark:bg-gray-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="px-4 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap">
                    ⭐ MÁS POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
                </div>
                <h4 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h4>
                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mb-4 min-h-[40px]">{plan.description}</p>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-3xl lg:text-5xl font-black text-gray-900 dark:text-white">{plan.price}</span>
                  <span className="text-gray-500 dark:text-gray-400 mb-1 lg:mb-2 text-base">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm lg:text-base text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Botón de selección dentro de cada card */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect(plan.id)
                }}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
              </button>

              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Atrás</span>
        </button>
        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`px-8 py-3 rounded-xl font-semibold transition-all ${
            selected
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:shadow-lg hover:shadow-sky-500/30'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {selected ? 'Continuar con ' + plans.find(p => p.id === selected)?.name : 'Selecciona un plan'}
        </button>
      </div>
    </div>
  )
}
