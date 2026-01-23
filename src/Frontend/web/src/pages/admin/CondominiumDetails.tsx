import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Building2, MapPin, Edit, Layers, Users, DoorOpen } from 'lucide-react'
import { condominiumService, CondominiumDetailDto } from '../../lib/condominiumService'

export default function CondominiumDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [condo, setCondo] = useState<CondominiumDetailDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadCondominium()
    }
  }, [id])

  const loadCondominium = async () => {
    try {
      const data = await condominiumService.getCondominiumById(id!)
      setCondo(data)
    } catch (error) {
      console.error('Failed to load condominium', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8 text-gray-600 dark:text-gray-400">Cargando detalles...</div>
  }

  if (!condo) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Condominio no encontrado</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/condominiums')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{condo.name}</h1>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-1">
              <MapPin className="w-4 h-4" />
              <span>{condo.address}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/admin/condominiums/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <Edit className="w-4 h-4" />
            Editar
          </Link>
          <Link
            to={`/admin/condominiums/${id}/units`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Layers className="w-4 h-4" />
            Administrar Unidades
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Edificios/Torres</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{condo.totalBuildings}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Unidades</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{condo.totalUnits}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Residentes Activos</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">--</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Información General</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre del Condominio</label>
            <p className="text-gray-900 dark:text-white">{condo.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Dirección Completa</label>
            <p className="text-gray-900 dark:text-white">{condo.address}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ciudad / Estado</label>
            <p className="text-gray-900 dark:text-white">{condo.city}, {condo.state}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Código Postal</label>
            <p className="text-gray-900 dark:text-white">{condo.postalCode}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Estado del Sistema</label>
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
              condo.isActive 
                ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-400' 
                : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-400'
            }`}>
              {condo.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Fecha de Registro</label>
            <p className="text-gray-900 dark:text-white">{new Date(condo.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
