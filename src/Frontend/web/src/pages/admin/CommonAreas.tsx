import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, Building2, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import {
  commonAreaService,
  CommonAreaType,
  commonAreaTypeNames,
  type CommonAreaListDto,
  type CreateCommonAreaRequest,
  type UpdateCommonAreaRequest
} from '../../lib/commonAreaService'

const defaultForm: CreateCommonAreaRequest = {
  condominiumId: '',
  name: '',
  type: CommonAreaType.Garden,
  description: '',
  level: '',
  coordinateX: null,
  coordinateY: null,
  imageUrlsJson: '[]'
}

export default function CommonAreas() {
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState('')
  const [areas, setAreas] = useState<CommonAreaListDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CommonAreaListDto | null>(null)
  const [formData, setFormData] = useState<CreateCommonAreaRequest>(defaultForm)

  useEffect(() => {
    loadCondominiums()
  }, [])

  useEffect(() => {
    if (selectedCondominium) {
      loadAreas(selectedCondominium)
    }
  }, [selectedCondominium])

  const activeCount = useMemo(() => areas.filter(a => a.isActive).length, [areas])

  const loadCondominiums = async () => {
    try {
      const data = await condominiumService.getAllCondominiums()
      setCondominiums(data)
      if (data.length > 0 && !selectedCondominium) {
        setSelectedCondominium(data[0].id)
      }
    } catch {
      toast.error('No se pudieron cargar condominios')
    }
  }

  const loadAreas = async (condominiumId: string) => {
    setIsLoading(true)
    try {
      const data = await commonAreaService.getByCondominium(condominiumId, true)
      setAreas(data)
    } catch {
      toast.error('No se pudieron cargar áreas comunes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditing(null)
    setFormData({ ...defaultForm, condominiumId: selectedCondominium })
    setShowForm(true)
  }

  const handleOpenEdit = (area: CommonAreaListDto) => {
    setEditing(area)
    setFormData({
      condominiumId: area.condominiumId,
      name: area.name,
      description: area.description || '',
      type: area.type,
      buildingId: area.buildingId,
      level: area.level || '',
      coordinateX: area.coordinateX ?? null,
      coordinateY: area.coordinateY ?? null,
      imageUrlsJson: area.imageUrlsJson || '[]'
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !selectedCondominium) {
      toast.error('Nombre y condominio son obligatorios')
      return
    }

    try {
      if (editing) {
        const updatePayload: UpdateCommonAreaRequest = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          buildingId: formData.buildingId,
          level: formData.level,
          coordinateX: formData.coordinateX,
          coordinateY: formData.coordinateY,
          imageUrlsJson: formData.imageUrlsJson,
          isActive: editing.isActive
        }
        await commonAreaService.update(editing.id, updatePayload)
        toast.success('Área común actualizada')
      } else {
        await commonAreaService.create({ ...formData, condominiumId: selectedCondominium })
        toast.success('Área común creada')
      }

      setShowForm(false)
      setEditing(null)
      await loadAreas(selectedCondominium)
    } catch {
      toast.error('No se pudo guardar el área común')
    }
  }

  const handleToggleStatus = async (area: CommonAreaListDto) => {
    try {
      await commonAreaService.setStatus(area.id, !area.isActive)
      toast.success(!area.isActive ? 'Área activada' : 'Área desactivada')
      await loadAreas(selectedCondominium)
    } catch {
      toast.error('No se pudo actualizar el estado')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta área común?')) return
    try {
      await commonAreaService.delete(id)
      toast.success('Área eliminada')
      await loadAreas(selectedCondominium)
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Áreas Comunes</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Espacios de uso general no reservables</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold"
          disabled={!selectedCondominium}
        >
          <Plus className="w-4 h-4" /> Nueva área
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex-1">
            <label className="text-xs text-gray-500 dark:text-gray-400">Condominio</label>
            <select
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              value={selectedCondominium}
              onChange={e => setSelectedCondominium(e.target.value)}
            >
              {condominiums.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Activas: <span className="font-bold text-green-600 dark:text-green-400">{activeCount}</span> / {areas.length}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {areas.map(area => (
            <div key={area.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{area.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{area.typeName}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${area.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {area.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {area.description && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{area.description}</p>
              )}

              <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {area.level && <p>Nivel: {area.level}</p>}
                {(area.coordinateX !== null && area.coordinateX !== undefined && area.coordinateY !== null && area.coordinateY !== undefined) && (
                  <p className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {area.coordinateX}, {area.coordinateY}</p>
                )}
                {area.buildingId && <p className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> Edificio asociado</p>}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button onClick={() => handleOpenEdit(area)} className="px-3 py-1.5 text-xs rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300 inline-flex items-center gap-1"><Pencil className="w-3 h-3" /> Editar</button>
                <button onClick={() => handleToggleStatus(area)} className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 inline-flex items-center gap-1">
                  {area.isActive ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />} {area.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => handleDelete(area.id)} className="ml-auto px-3 py-1.5 text-xs rounded-lg bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Eliminar</button>
              </div>
            </div>
          ))}

          {areas.length === 0 && (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center text-gray-500">
              No hay áreas comunes registradas
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Editar área común' : 'Nueva área común'}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">Nombre</label>
                <input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">Descripción</label>
                <textarea value={formData.description || ''} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300">Tipo</label>
                  <select value={formData.type} onChange={e => setFormData(prev => ({ ...prev, type: Number(e.target.value) as CommonAreaType }))} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                    {Object.values(CommonAreaType)
                      .filter(v => typeof v === 'number')
                      .map(v => (
                        <option key={v} value={v}>{commonAreaTypeNames[v as number]}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300">Nivel (opcional)</label>
                  <input value={formData.level || ''} onChange={e => setFormData(prev => ({ ...prev, level: e.target.value }))} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300">Coordenada X</label>
                  <input type="number" step="0.01" value={formData.coordinateX ?? ''} onChange={e => setFormData(prev => ({ ...prev, coordinateX: e.target.value ? Number(e.target.value) : null }))} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300">Coordenada Y</label>
                  <input type="number" step="0.01" value={formData.coordinateY ?? ''} onChange={e => setFormData(prev => ({ ...prev, coordinateY: e.target.value ? Number(e.target.value) : null }))} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">Imágenes (JSON array)</label>
                <input value={formData.imageUrlsJson || ''} onChange={e => setFormData(prev => ({ ...prev, imageUrlsJson: e.target.value }))} className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder='["https://..."]' />
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Cancelar</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
