import { useState } from 'react'
import { Building, Home, ChevronLeft, Check } from 'lucide-react'

interface BuildingTypeStepProps {
  data: {
    vertical: boolean
    horizontal: boolean
  }
  sections: string[]
  onUpdate: (data: { vertical: boolean; horizontal: boolean }) => void
  onNext: () => void
  onBack: () => void
}

export default function BuildingTypeStep({ data, sections, onUpdate, onNext, onBack }: BuildingTypeStepProps) {
  const [buildingTypes, setBuildingTypes] = useState(data)

  const toggleType = (type: 'vertical' | 'horizontal') => {
    setBuildingTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }))
  }

  const handleContinue = () => {
    if (!buildingTypes.vertical && !buildingTypes.horizontal) {
      alert('Debes seleccionar al menos un tipo de edificio')
      return
    }
    onUpdate(buildingTypes)
    onNext()
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Tipo de Edificios
        </h3>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Selecciona el tipo de construcción de tu condominio (puedes elegir ambos)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Vertical (Departamentos) */}
        <div
          onClick={() => toggleType('vertical')}
          className={`relative p-6 md:p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
            buildingTypes.vertical
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 shadow-lg shadow-sky-500/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-700'
          }`}
        >
          <div className="text-center">
            <div className={`w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-2xl flex items-center justify-center transition-all ${
              buildingTypes.vertical
                ? 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <Building className={`w-8 h-8 md:w-10 md:h-10 ${
                buildingTypes.vertical ? 'text-white' : 'text-gray-400'
              }`} />
            </div>

            <h4 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2 md:mb-3">
              Vertical
            </h4>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-3 md:mb-4">
              Edificios de departamentos
            </p>

            <ul className="text-left space-y-1.5 md:space-y-2">
              <li className="flex items-center text-xs md:text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500 mr-2 flex-shrink-0" />
                <span>Múltiples pisos</span>
              </li>
              <li className="flex items-center text-xs md:text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500 mr-2 flex-shrink-0" />
                <span>Departamentos por piso</span>
              </li>
              <li className="flex items-center text-xs md:text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500 mr-2 flex-shrink-0" />
                <span>Torres o bloques</span>
              </li>
            </ul>
          </div>

          {buildingTypes.vertical && (
            <div className="absolute top-4 right-4">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-sky-500 flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Horizontal (Casas) */}
        <div
          onClick={() => toggleType('horizontal')}
          className={`relative p-6 md:p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
            buildingTypes.horizontal
              ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 shadow-lg shadow-sky-500/30'
              : 'border-gray-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-700'
          }`}
        >
          <div className="text-center">
            <div className={`w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-2xl flex items-center justify-center transition-all ${
              buildingTypes.horizontal
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <Home className={`w-8 h-8 md:w-10 md:h-10 ${
                buildingTypes.horizontal ? 'text-white' : 'text-gray-400'
              }`} />
            </div>

            <h4 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2 md:mb-3">
              Horizontal
            </h4>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-3 md:mb-4">
              Fraccionamiento de casas
            </p>

            <ul className="text-left space-y-1.5 md:space-y-2">
              <li className="flex items-center text-xs md:text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500 mr-2 flex-shrink-0" />
                <span>Casas independientes</span>
              </li>
              <li className="flex items-center text-xs md:text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500 mr-2 flex-shrink-0" />
                <span>Un solo nivel o varios</span>
              </li>
              <li className="flex items-center text-xs md:text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500 mr-2 flex-shrink-0" />
                <span>Numeración por lote o manzana</span>
              </li>
            </ul>
          </div>

          {buildingTypes.horizontal && (
            <div className="absolute top-4 right-4">
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info box if sections exist */}
      {sections.length > 0 && (
        <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <p className="text-xs md:text-sm text-blue-700 dark:text-blue-300">
            <strong>Nota:</strong> En el siguiente paso podrás asignar edificios a las secciones que definiste: {sections.join(', ')}
          </p>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-gray-400 transition-all text-sm md:text-base"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          <span>Atrás</span>
        </button>
        <button
          onClick={handleContinue}
          disabled={!buildingTypes.vertical && !buildingTypes.horizontal}
          className="px-6 md:px-8 py-2 md:py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-sky-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
