import { useState } from 'react'
import { Building, Home, Plus, X, ChevronLeft, Store } from 'lucide-react'

interface Building {
  id: string
  name: string
  type: 'vertical' | 'horizontal'
  section?: string
  numberOfUnits: number
  startsAtGroundFloor?: boolean
  units: Array<{
    number: string
    floor?: number
    isCommercial: boolean
  }>
}

interface UnitsSetupStepProps {
  buildingTypes: {
    vertical: boolean
    horizontal: boolean
  }
  sections: string[]
  buildings: Building[]
  onUpdate: (buildings: Building[]) => void
  onNext: () => void
  onBack: () => void
}

export default function UnitsSetupStep({
  buildingTypes,
  sections,
  buildings,
  onUpdate,
  onNext,
  onBack
}: UnitsSetupStepProps) {
  const [buildingList, setBuildingList] = useState<Building[]>(buildings.length > 0 ? buildings : [])
  const [showAddBuilding, setShowAddBuilding] = useState(buildings.length === 0)
  const [newBuilding, setNewBuilding] = useState({
    name: '',
    type: (buildingTypes.vertical ? 'vertical' : 'horizontal') as 'vertical' | 'horizontal',
    section: sections.length > 0 ? sections[0] : '',
    numberOfUnits: 10,
    floorsForVertical: 5,
    startsAtGroundFloor: false
  })

  const addBuilding = () => {
    if (!newBuilding.name || newBuilding.numberOfUnits < 1) {
      alert('Por favor completa todos los campos')
      return
    }

    const units: Building['units'] = []
    
    if (newBuilding.type === 'vertical') {
      // Generate units for vertical building
      const unitsPerFloor = Math.ceil(newBuilding.numberOfUnits / newBuilding.floorsForVertical)
      let unitCounter = 1
      const startFloor = newBuilding.startsAtGroundFloor ? 0 : 1
      const endFloor = newBuilding.startsAtGroundFloor ? newBuilding.floorsForVertical - 1 : newBuilding.floorsForVertical
      
      for (let floor = startFloor; floor <= endFloor; floor++) {
        for (let u = 1; u <= unitsPerFloor && unitCounter <= newBuilding.numberOfUnits; u++) {
          units.push({
            number: `${floor}${u.toString().padStart(2, '0')}`,
            floor: floor,
            isCommercial: false
          })
          unitCounter++
        }
      }
    } else {
      // Generate units for horizontal building
      for (let i = 1; i <= newBuilding.numberOfUnits; i++) {
        units.push({
          number: i.toString(),
          isCommercial: false
        })
      }
    }

    const building: Building = {
      id: Date.now().toString(),
      name: newBuilding.name,
      type: newBuilding.type,
      section: sections.length > 0 ? newBuilding.section : undefined,
      numberOfUnits: newBuilding.numberOfUnits,
      startsAtGroundFloor: newBuilding.startsAtGroundFloor,
      units
    }

    setBuildingList([...buildingList, building])
    setShowAddBuilding(false)
    setNewBuilding({
      name: '',
      type: buildingTypes.vertical ? 'vertical' : 'horizontal',
      section: sections.length > 0 ? sections[0] : '',
      numberOfUnits: 10,
      floorsForVertical: 5,
      startsAtGroundFloor: false
    })
  }

  const removeBuilding = (id: string) => {
    setBuildingList(buildingList.filter(b => b.id !== id))
  }

  const toggleUnitCommercial = (buildingId: string, unitNumber: string) => {
    setBuildingList(buildingList.map(building => {
      if (building.id === buildingId) {
        return {
          ...building,
          units: building.units.map(unit =>
            unit.number === unitNumber
              ? { ...unit, isCommercial: !unit.isCommercial }
              : unit
          )
        }
      }
      return building
    }))
  }

  const handleContinue = () => {
    if (buildingList.length === 0) {
      alert('Debes agregar al menos un edificio con unidades')
      return
    }
    onUpdate(buildingList)
    onNext()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Configuración de Unidades
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Define tus edificios y el número de unidades (viviendas) en cada uno
        </p>
      </div>

      {/* Buildings List */}
      {buildingList.length > 0 && (
        <div className="space-y-4">
          {buildingList.map((building) => (
            <div
              key={building.id}
              className="p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    building.type === 'vertical'
                      ? 'bg-sky-100 dark:bg-sky-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    {building.type === 'vertical' ? (
                      <Building className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                    ) : (
                      <Home className="w-6 h-6 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      {building.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {building.type === 'vertical' ? 'Edificio Vertical' : 'Horizontal'}
                      {building.section && ` • ${building.section}`}
                      {' • '}{building.numberOfUnits} unidades
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeBuilding(building.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Units Preview */}
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unidades generadas (haz clic para marcar como local comercial):
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {building.units.slice(0, 20).map((unit) => (
                    <button
                      key={unit.number}
                      onClick={() => toggleUnitCommercial(building.id, unit.number)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        unit.isCommercial
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-2 border-orange-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:border-sky-500'
                      }`}
                    >
                      {unit.isCommercial && <Store className="w-3 h-3 inline mr-1" />}
                      {unit.number}
                    </button>
                  ))}
                  {building.units.length > 20 && (
                    <span className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                      +{building.units.length - 20} más
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Building Form */}
      {showAddBuilding ? (
        <div className="p-6 bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-200 dark:border-sky-800 rounded-2xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre del Edificio *
            </label>
            <input
              type="text"
              value={newBuilding.name}
              onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Ej: Torre A, Edificio Norte, Manzana 1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Edificio *
              </label>
              <select
                value={newBuilding.type}
                onChange={(e) => setNewBuilding({ ...newBuilding, type: e.target.value as 'vertical' | 'horizontal' })}
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {buildingTypes.vertical && <option value="vertical">Vertical (Departamentos)</option>}
                {buildingTypes.horizontal && <option value="horizontal">Horizontal (Casas)</option>}
              </select>
            </div>

            {sections.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sección
                </label>
                <select
                  value={newBuilding.section}
                  onChange={(e) => setNewBuilding({ ...newBuilding, section: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {sections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Número de Unidades *
              </label>
              <input
                type="number"
                min="1"
                value={newBuilding.numberOfUnits}
                onChange={(e) => setNewBuilding({ ...newBuilding, numberOfUnits: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {newBuilding.type === 'vertical' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Número de Pisos *
                </label>
                <input
                  type="number"
                  min="1"
                  value={newBuilding.floorsForVertical}
                  onChange={(e) => setNewBuilding({ ...newBuilding, floorsForVertical: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {newBuilding.type === 'vertical' && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <input
                type="checkbox"
                id="startsAtGroundFloor"
                checked={newBuilding.startsAtGroundFloor}
                onChange={(e) => setNewBuilding({ ...newBuilding, startsAtGroundFloor: e.target.checked })}
                className="mt-0.5 w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
              />
              <div>
                <label htmlFor="startsAtGroundFloor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Incluye Planta Baja (PB)
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Activa si la numeración empieza en 0 (ej: 001, 002..., 101, 102...)
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={addBuilding}
              className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition-colors"
            >
              Agregar Edificio
            </button>
            {buildingList.length > 0 && (
              <button
                onClick={() => setShowAddBuilding(false)}
                className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-gray-400 transition-all"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddBuilding(true)}
          className="w-full px-6 py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-2xl font-semibold hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-all flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Agregar Otro Edificio</span>
        </button>
      )}

      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:border-gray-400 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Atrás</span>
        </button>
        <button
          onClick={handleContinue}
          disabled={buildingList.length === 0}
          className="px-8 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-sky-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
