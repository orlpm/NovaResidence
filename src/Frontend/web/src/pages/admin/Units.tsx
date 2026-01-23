import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Home, Search, Filter, ExternalLink, Edit, X, Save, Plus } from 'lucide-react'
import { condominiumService, CondominiumDto } from '../../lib/condominiumService'
import { useAuthStore } from '../../stores/authStore'
import ResidentsSection from '../../components/ResidentsSection'

interface UnitWithCondo {
  id: string
  unitNumber: string
  floor: number
  area?: number
  bedrooms?: number
  bathrooms?: number
  buildingName: string
  buildingId: string
  condominiumId: string
  condominiumName: string
}

function Units() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [condominiums, setCondominiums] = useState<CondominiumDto[]>([])
  const [allUnits, setAllUnits] = useState<UnitWithCondo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCondo, setSelectedCondo] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<UnitWithCondo | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<{
    unitNumber: string
    floor: number
    area: number
    bedrooms: number
    bathrooms: number
  }>({ unitNumber: '', floor: 1, area: 0, bedrooms: 0, bathrooms: 0 })

  useEffect(() => {
    loadData()
  }, [])

  const openUnitDetails = (unit: UnitWithCondo) => {
    setSelectedUnit(unit)
    setEditForm({
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      area: unit.area || 0,
      bedrooms: unit.bedrooms || 0,
      bathrooms: unit.bathrooms || 0
    })
    setIsEditing(false)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!selectedUnit) return
    
    try {
      console.log('💾 Guardando cambios:', editForm)
      await condominiumService.updateUnit(selectedUnit.id, {
        unitNumber: editForm.unitNumber,
        floor: editForm.floor,
        area: editForm.area,
        bedrooms: editForm.bedrooms,
        bathrooms: editForm.bathrooms
      })
      console.log('✅ Unidad actualizada correctamente')
      setIsEditing(false)
      // Recargar datos
      await loadData()
      setShowModal(false)
    } catch (error) {
      console.error('❌ Error al guardar:', error)
      alert('Error al guardar los cambios. Por favor, intenta de nuevo.')
    }
  }

  const loadData = async () => {
    try {
      console.log('👤 Usuario actual:', user)
      if (!user?.id) {
        console.error('❌ No hay usuario autenticado o falta el ID')
        console.error('   Usuario:', JSON.stringify(user))
        console.warn('⚠️ Si ves este mensaje, haz logout y vuelve a hacer login')
        setLoading(false)
        return
      }
      console.log('🏢 Cargando condominios para usuario:', user.id, user.email)
      const condos = await condominiumService.getCondominiums(user.id)
      console.log('✅ Condominios cargados:', condos.length, condos)
      setCondominiums(condos)
      
      // Cargar detalles de cada condominio para obtener todas las unidades
      const units: UnitWithCondo[] = []
      for (const condo of condos) {
        console.log(`📋 Cargando detalles de: ${condo.name}`)
        const details = await condominiumService.getCondominiumById(condo.id)
        console.log(`  - Edificios: ${details.buildings.length}`)
        
        for (const building of details.buildings) {
          console.log(`  - ${building.name}: ${building.units.length} unidades`)
          for (const unit of building.units) {
            units.push({
              ...unit,
              buildingName: building.name,
              buildingId: building.id,
              condominiumId: condo.id,
              condominiumName: condo.name
            })
          }
        }
      }
      console.log('✅ Total de unidades cargadas:', units.length, units)
      setAllUnits(units)
    } catch (error) {
      console.error('❌ Error loading units:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUnits = allUnits.filter(unit => {
    const matchesSearch = unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         unit.condominiumName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         unit.buildingName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCondo = selectedCondo === 'all' || unit.condominiumId === selectedCondo
    return matchesSearch && matchesCondo
  })

  // Agrupar por condominio
  const unitsByCondo = filteredUnits.reduce((acc, unit) => {
    if (!acc[unit.condominiumId]) {
      acc[unit.condominiumId] = {
        name: unit.condominiumName,
        units: []
      }
    }
    acc[unit.condominiumId].units.push(unit)
    return acc
  }, {} as Record<string, { name: string; units: UnitWithCondo[] }>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show message if user is not authenticated
  if (!user?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sesión no válida
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Por favor, cierra sesión y vuelve a iniciar sesión para continuar.
          </p>
          <button
            onClick={() => {
              useAuthStore.getState().logout()
              navigate('/login')
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
          <strong>Debug:</strong> Condominios: {condominiums.length} | Total Unidades: {allUnits.length} | Filtradas: {filteredUnits.length} | Agrupaciones: {Object.keys(unitsByCondo).length}
        </div>
      )}
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Todas las Unidades</h1>
        <p className="text-gray-500 dark:text-gray-400">Vista general de todas las unidades en todos los condominios</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Condominios</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{condominiums.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Home className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Unidades</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{allUnits.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
              <Filter className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Filtradas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredUnits.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por unidad, condominio o edificio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={selectedCondo}
            onChange={(e) => setSelectedCondo(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
          >
            <option value="all">Todos los condominios</option>
            {condominiums.map(condo => (
              <option key={condo.id} value={condo.id}>{condo.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Units by Condominium */}
      {Object.keys(unitsByCondo).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Home className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No se encontraron unidades</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || selectedCondo !== 'all' 
              ? 'Intenta ajustar los filtros de búsqueda' 
              : 'Aún no hay unidades registradas en los condominios'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(unitsByCondo).map(([condoId, data]) => (
            <div key={condoId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Condominio Header */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{data.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{data.units.length} unidades</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/admin/condominiums/${condoId}/units`)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                >
                  <span>Administrar</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {/* Units Grid */}
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {data.units
                    .sort((a, b) => {
                      // Ordenar por edificio, luego por piso, luego por número
                      if (a.buildingName !== b.buildingName) {
                        return a.buildingName.localeCompare(b.buildingName)
                      }
                      if (a.floor !== b.floor) return a.floor - b.floor
                      return a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true })
                    })
                    .map(unit => (
                      <div
                        key={unit.id}
                        className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer"
                        onClick={() => openUnitDetails(unit)}
                      >
                        <div className="text-center">
                          <div className="text-xl font-bold text-gray-900 dark:text-white">{unit.unitNumber}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{unit.buildingName}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">Piso {unit.floor}</div>
                          {unit.area && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{unit.area} m²</div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalles/Edición */}
      {showModal && selectedUnit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Unidad {selectedUnit.unitNumber}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedUnit.condominiumName} - {selectedUnit.buildingName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowModal(false)
                    setIsEditing(false)
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
                    Número de Unidad
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.unitNumber}
                      onChange={(e) => setEditForm({ ...editForm, unitNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedUnit.unitNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Piso
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.floor}
                      onChange={(e) => setEditForm({ ...editForm, floor: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedUnit.floor}</p>
                  )}
                </div>
              </div>

              {/* Detalles de la propiedad */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Área (m²)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.area}
                      onChange={(e) => setEditForm({ ...editForm, area: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedUnit.area || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Recámaras
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.bedrooms}
                      onChange={(e) => setEditForm({ ...editForm, bedrooms: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedUnit.bedrooms || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Baños
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.5"
                      value={editForm.bathrooms}
                      onChange={(e) => setEditForm({ ...editForm, bathrooms: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedUnit.bathrooms || '-'}</p>
                  )}
                </div>
              </div>

              {/* Ubicación */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Ubicación</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Condominio:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedUnit.condominiumName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Edificio:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedUnit.buildingName}</p>
                  </div>
                </div>
              </div>

              {/* Sección de Residentes */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <ResidentsSection 
                  unitId={selectedUnit.id}
                  unitNumber={selectedUnit.unitNumber}
                  buildingName={selectedUnit.buildingName}
                  condominiumName={selectedUnit.condominiumName}
                />
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => navigate(`/admin/condominiums/${selectedUnit.condominiumId}/units`)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Ver todas las unidades del condominio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Units

