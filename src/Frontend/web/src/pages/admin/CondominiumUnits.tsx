import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Plus, Trash2, Home, Layers, X, Save } from 'lucide-react'
import { condominiumService, CondominiumDetailDto, UnitDto } from '../../lib/condominiumService'
import ResidentsSection from '../../components/ResidentsSection'

interface AddBuildingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; totalFloors: number }) => void
}

function AddBuildingModal({ isOpen, onClose, onSubmit }: AddBuildingModalProps) {
  const [name, setName] = useState('')
  const [totalFloors, setTotalFloors] = useState(1)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, totalFloors })
    setName('')
    setTotalFloors(1)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nuevo Edificio</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre del Edificio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Torre A, Edificio Norte"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número de Pisos <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              value={totalFloors}
              onChange={(e) => setTotalFloors(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Crear Edificio
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface AddUnitModalProps {
  isOpen: boolean
  buildingName: string
  onClose: () => void
  onSubmit: (data: { unitNumber: string; floor: number }) => void
}

function AddUnitModal({ isOpen, buildingName, onClose, onSubmit }: AddUnitModalProps) {
  const [unitNumber, setUnitNumber] = useState('')
  const [floor, setFloor] = useState(1)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ unitNumber, floor })
    setUnitNumber('')
    setFloor(1)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nueva Unidad</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{buildingName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número de Unidad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="Ej: 101, A-201"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Piso <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={0}
              value={floor}
              onChange={(e) => setFloor(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Crear Unidad
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CondominiumUnits() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [condo, setCondo] = useState<CondominiumDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false)
  const [showAddUnitModal, setShowAddUnitModal] = useState(false)
  const [showEditUnitModal, setShowEditUnitModal] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<UnitDto | null>(null)
  const [editForm, setEditForm] = useState<{
    unitNumber: string
    floor: number
    area: number
    bedrooms: number
    bathrooms: number
  }>({ unitNumber: '', floor: 1, area: 0, bedrooms: 0, bathrooms: 0 })

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      console.log('Cargando datos del condominio:', id)
      const data = await condominiumService.getCondominiumById(id!)
      console.log('Datos cargados:', data)
      setCondo(data)
      if (data.buildings.length > 0 && !selectedBuildingId) {
        setSelectedBuildingId(data.buildings[0].id)
        console.log('Edificio seleccionado automáticamente:', data.buildings[0].id)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('Error cargando información del condominio')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBuilding = async (data: { name: string; totalFloors: number }) => {
    try {
      await condominiumService.addBuilding(id!, data)
      await loadData()
    } catch (error) {
      console.error(error)
      alert("Error creando edificio")
    }
  }

  const handleDeleteBuilding = async (buildingId: string) => {
    if (!confirm("¿Eliminar este edificio y todas sus unidades?")) return
    try {
      await condominiumService.deleteBuilding(buildingId)
      await loadData()
      if (selectedBuildingId === buildingId) setSelectedBuildingId(null)
    } catch (error) {
      console.error(error)
      alert("Error eliminando edificio")
    }
  }

  const handleAddUnit = async (data: { unitNumber: string; floor: number }) => {
    if (!selectedBuildingId) return
    try {
      await condominiumService.addUnit(selectedBuildingId, data)
      await loadData()
    } catch (error) {
      console.error(error)
      alert("Error creando unidad")
    }
  }

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm("¿Eliminar esta unidad?")) return
    try {
      await condominiumService.deleteUnit(unitId)
      await loadData()
    } catch (error) {
      console.error(error)
      alert("Error eliminando unidad")
    }
  }

  const openEditUnit = (unit: UnitDto) => {
    setSelectedUnit(unit)
    setEditForm({
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      area: unit.area || 0,
      bedrooms: unit.bedrooms || 0,
      bathrooms: unit.bathrooms || 0
    })
    setShowEditUnitModal(true)
  }

  const handleSaveUnit = async () => {
    if (!selectedUnit) return
    
    try {
      console.log('💾 Guardando cambios de unidad:', editForm)
      await condominiumService.updateUnit(selectedUnit.id, {
        unitNumber: editForm.unitNumber,
        floor: editForm.floor,
        area: editForm.area,
        bedrooms: editForm.bedrooms,
        bathrooms: editForm.bathrooms
      })
      console.log('✅ Unidad actualizada correctamente')
      await loadData()
      setShowEditUnitModal(false)
      setSelectedUnit(null)
    } catch (error) {
      console.error('❌ Error al guardar:', error)
      alert('Error al guardar los cambios. Por favor, intenta de nuevo.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!condo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Condominio no encontrado</p>
      </div>
    )
  }

  const selectedBuilding = condo.buildings.find(b => b.id === selectedBuildingId)
  
  console.log('Estado actual:', {
    condoId: id,
    totalBuildings: condo.buildings.length,
    selectedBuildingId,
    selectedBuilding,
    unitsCount: selectedBuilding?.units.length
  })

  return (
    <div className="space-y-6 pb-8">
      {/* Debug Info - Temporal */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-sm">
          <strong>Debug:</strong> Edificios: {condo.buildings.length} | Edificio seleccionado: {selectedBuildingId} | Unidades: {selectedBuilding?.units.length || 0}
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/admin/condominiums/${id}`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edificios y Unidades</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{condo.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
          <Layers className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            <strong>{condo.totalBuildings}</strong> edificios • <strong>{condo.totalUnits}</strong> unidades
          </span>
        </div>
      </div>

      <div className="flex gap-6 min-h-[600px]">
        {/* Buildings Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col shadow-sm max-h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Edificios
            </h2>
            <button 
              onClick={() => setShowAddBuildingModal(true)}
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-blue-600 dark:text-blue-400"
              title="Agregar Edificio"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {condo.buildings.map(building => (
              <div 
                key={building.id}
                onClick={() => setSelectedBuildingId(building.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all group ${
                  selectedBuildingId === building.id 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 shadow-sm' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-2 border-transparent'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-semibold ${selectedBuildingId === building.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                      {building.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span>{building.totalUnits} unidades</span>
                      <span>•</span>
                      <span>{building.totalFloors} pisos</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteBuilding(building.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                    title="Eliminar edificio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {condo.buildings.length === 0 && (
              <div className="text-center py-12 px-4">
                <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No hay edificios registrados</p>
                <button 
                  onClick={() => setShowAddBuildingModal(true)}
                  className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  + Agregar primer edificio
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Units Grid */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col shadow-sm max-h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Home className="w-4 h-4" /> 
              {selectedBuilding ? `Unidades de ${selectedBuilding.name}` : 'Unidades'}
            </h2>
            {selectedBuilding && (
              <button 
                onClick={() => setShowAddUnitModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Nueva Unidad
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!selectedBuilding ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <Building2 className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">Selecciona un edificio</p>
                <p className="text-sm">para ver y administrar sus unidades</p>
              </div>
            ) : selectedBuilding.units.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <Home className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">Sin unidades</p>
                <p className="text-sm mb-4">Este edificio no tiene unidades registradas</p>
                <button 
                  onClick={() => setShowAddUnitModal(true)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  + Agregar primera unidad
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {selectedBuilding.units
                  .sort((a, b) => {
                    // Ordenar primero por piso, luego por número de unidad
                    if (a.floor !== b.floor) return a.floor - b.floor
                    return a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true })
                  })
                  .map(unit => (
                  <div 
                    key={unit.id} 
                    className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-500 transition-all relative group cursor-pointer"
                    onClick={() => openEditUnit(unit)}
                  >
                    <div className="text-center pb-8">
                      <span className="text-2xl font-bold text-gray-800 dark:text-white">{unit.unitNumber}</span>
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Piso {unit.floor}</div>
                      {unit.area && (
                        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">{unit.area} m²</div>
                      )}
                    </div>
                    
                    <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditUnit(unit); }}
                        className="flex-1 px-2 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                        title="Editar detalles"
                      >
                        Detalles
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteUnit(unit.id); }}
                        className="px-2 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        title="Eliminar unidad"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddBuildingModal
        isOpen={showAddBuildingModal}
        onClose={() => setShowAddBuildingModal(false)}
        onSubmit={handleAddBuilding}
      />

      <AddUnitModal
        isOpen={showAddUnitModal}
        buildingName={selectedBuilding?.name || ''}
        onClose={() => setShowAddUnitModal(false)}
        onSubmit={handleAddUnit}
      />

      {/* Modal de Edición de Unidad */}
      {showEditUnitModal && selectedUnit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Editar Unidad {selectedUnit.unitNumber}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedBuilding?.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveUnit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </button>
                <button
                  onClick={() => {
                    setShowEditUnitModal(false)
                    setSelectedUnit(null)
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Número de Unidad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.unitNumber}
                    onChange={(e) => setEditForm({ ...editForm, unitNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Piso <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editForm.floor}
                    onChange={(e) => setEditForm({ ...editForm, floor: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Detalles de la propiedad */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Área (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.area}
                    onChange={(e) => setEditForm({ ...editForm, area: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recámaras
                  </label>
                  <input
                    type="number"
                    value={editForm.bedrooms}
                    onChange={(e) => setEditForm({ ...editForm, bedrooms: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Baños
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.bathrooms}
                    onChange={(e) => setEditForm({ ...editForm, bathrooms: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sección de Residentes */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <ResidentsSection 
                  unitId={selectedUnit.id}
                  unitNumber={selectedUnit.unitNumber}
                  buildingName={selectedBuilding?.name}
                  condominiumName={condo?.name}
                />
              </div>

              {/* Información adicional */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Información</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Los cambios se guardarán inmediatamente</li>
                  <li>• El número de unidad debe ser único en el edificio</li>
                  <li>• El piso debe ser un número válido</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
