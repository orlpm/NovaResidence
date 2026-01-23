import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  MapPin, 
  Home, 
  Users,
  Settings,
  Trash2,
  Edit,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { condominiumService, UserCondominiumDto } from '../../lib/condominiumService'
import { useAuthStore } from '../../stores/authStore'

function Condominiums() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    loadCondominiums()
  }, [user])

  const loadCondominiums = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const userId = user?.id
      const data = await condominiumService.getAllCondominiums(userId)
      setCondominiums(data)
    } catch (err) {
      console.error('Error loading condominiums:', err)
      setError('Error al cargar los condominios. Por favor intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCondominiums = condominiums.filter(condo => {
    const matchesSearch = condo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          condo.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || 
                          (filterStatus === 'active' && condo.isActive) ||
                          (filterStatus === 'inactive' && !condo.isActive)
    return matchesSearch && matchesFilter
  })

  const handleCreateNew = () => {
    navigate('/admin/dashboard', { state: { showWizard: true } })
  }

  const handleViewDetails = (condoId: string) => {
    navigate(`/admin/condominiums/${condoId}`)
    setOpenMenuId(null)
  }

  const handleEdit = (condoId: string) => {
    navigate(`/admin/condominiums/${condoId}/edit`)
    setOpenMenuId(null)
  }

  const handleManageBuildings = (condoId: string) => {
    navigate(`/admin/condominiums/${condoId}/units`)
    setOpenMenuId(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Condominios</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administra todos tus condominios y sus propiedades
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          Nuevo Condominio
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="pl-10 pr-8 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none cursor-pointer"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando condominios...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button 
            onClick={loadCondominiums}
            className="ml-auto text-sm font-medium hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredCondominiums.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchTerm || filterStatus !== 'all' 
              ? 'No se encontraron condominios' 
              : 'No tienes condominios aún'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {searchTerm || filterStatus !== 'all'
              ? 'Intenta con otros términos de búsqueda o filtros'
              : 'Crea tu primer condominio para comenzar a administrar tus propiedades'}
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              Crear Condominio
            </button>
          )}
        </div>
      )}

      {/* Condominiums Grid */}
      {!isLoading && !error && filteredCondominiums.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCondominiums.map((condo) => (
            <div
              key={condo.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300 group"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {condo.name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                        condo.isActive 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {condo.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === condo.id ? null : condo.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-500" />
                    </button>
                    
                    {openMenuId === condo.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                        <button
                          onClick={() => handleViewDetails(condo.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalles
                        </button>
                        <button
                          onClick={() => handleEdit(condo.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleManageBuildings(condo.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <Settings className="w-4 h-4" />
                          Gestionar Edificios
                        </button>
                        <hr className="my-1 border-gray-200 dark:border-gray-700" />
                        <button
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4">
                {/* Address */}
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{condo.address}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{condo.totalBuildings}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Edificios</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{condo.totalUnits}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Unidades</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {condo.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {condo.description}
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Creado: {formatDate(condo.createdAt)}</span>
                  <button
                    onClick={() => handleViewDetails(condo.id)}
                    className="text-sky-600 dark:text-sky-400 font-medium hover:underline"
                  >
                    Ver más →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {!isLoading && !error && condominiums.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{condominiums.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Condominios</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {condominiums.filter(c => c.isActive).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Activos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {condominiums.reduce((sum, c) => sum + c.totalBuildings, 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Edificios</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {condominiums.reduce((sum, c) => sum + c.totalUnits, 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Unidades</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Condominiums
