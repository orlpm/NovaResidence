import { useEffect, useMemo, useState } from 'react'
import { Layers, Plus, Trash2, MapPin, Eye, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import {
  condominiumMapService,
  MapScopeType,
  CondominiumMarkerType,
  markerTypeNames,
  type CondominiumMapListDto,
  type CondominiumMapDetailDto,
  type CreateCondominiumMapRequest,
  type CreateCondominiumMapMarkerRequest
} from '../../lib/condominiumMapService'

const markerDefaults: CreateCondominiumMapMarkerRequest = {
  label: '',
  tooltip: '',
  markerType: CondominiumMarkerType.Generic,
  markerColor: '#0ea5e9',
  coordinateX: 50,
  coordinateY: 50,
  layerName: 'General',
  layerEnabledByDefault: true
}

type MapBackgroundSource = 'imageUrl' | 'upload' | 'mapsLink'

const isMapsLink = (url?: string | null) => {
  if (!url) return false
  const lower = url.toLowerCase()
  return lower.includes('google.com/maps') || lower.includes('maps.app.goo.gl')
}

const isEmbeddableMapsUrl = (url?: string | null) => {
  if (!url) return false
  return url.includes('/maps/embed') || url.includes('/maps?')
}

export default function CondominiumMaps() {
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState('')
  const [maps, setMaps] = useState<CondominiumMapListDto[]>([])
  const [selectedMapId, setSelectedMapId] = useState('')
  const [mapDetail, setMapDetail] = useState<CondominiumMapDetailDto | null>(null)
  const [layersEnabled, setLayersEnabled] = useState<Record<string, boolean>>({})

  const [showMapForm, setShowMapForm] = useState(false)
  const [showMarkerForm, setShowMarkerForm] = useState(false)
  const [mapBackgroundSource, setMapBackgroundSource] = useState<MapBackgroundSource>('imageUrl')
  const [mapBackgroundFile, setMapBackgroundFile] = useState<File | null>(null)
  const [mapBackgroundMapsLink, setMapBackgroundMapsLink] = useState('')
  const [uploadingBackground, setUploadingBackground] = useState(false)

  const [mapForm, setMapForm] = useState<CreateCondominiumMapRequest>({
    condominiumId: '',
    name: '',
    description: '',
    scopeType: MapScopeType.Level,
    scopeReference: '',
    backgroundImageUrl: ''
  })

  const [markerForm, setMarkerForm] = useState<CreateCondominiumMapMarkerRequest>(markerDefaults)

  useEffect(() => {
    loadCondominiums()
  }, [])

  useEffect(() => {
    if (selectedCondominium) loadMaps(selectedCondominium)
  }, [selectedCondominium])

  useEffect(() => {
    if (selectedMapId) loadMapDetail(selectedMapId)
  }, [selectedMapId])

  const visibleMarkers = useMemo(() => {
    if (!mapDetail) return []
    return mapDetail.markers.filter(marker => {
      const layerEnabled = layersEnabled[marker.layerName]
      return marker.isActive && (layerEnabled === undefined ? marker.layerEnabledByDefault : layerEnabled)
    })
  }, [mapDetail, layersEnabled])

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

  const loadMaps = async (condominiumId: string) => {
    try {
      const data = await condominiumMapService.getByCondominium(condominiumId)
      setMaps(data)
      if (data.length > 0) {
        setSelectedMapId(prev => prev || data[0].id)
      } else {
        setSelectedMapId('')
        setMapDetail(null)
      }
    } catch {
      toast.error('No se pudieron cargar los mapas')
    }
  }

  const loadMapDetail = async (mapId: string) => {
    try {
      const detail = await condominiumMapService.getById(mapId)
      setMapDetail(detail)
      const nextLayers: Record<string, boolean> = {}
      detail.layers.forEach(layer => {
        nextLayers[layer.layerName] = layer.enabledByDefault
      })
      setLayersEnabled(nextLayers)
    } catch {
      toast.error('No se pudo cargar el mapa seleccionado')
    }
  }

  const handleCreateMap = async () => {
    if (!selectedCondominium || !mapForm.name.trim() || !mapForm.scopeReference.trim()) {
      toast.error('Nombre y referencia son obligatorios')
      return
    }

    try {
      let backgroundImageUrl = (mapForm.backgroundImageUrl || '').trim()

      if (mapBackgroundSource === 'mapsLink') {
        if (!mapBackgroundMapsLink.trim()) {
          toast.error('Ingresa el link de Google Maps')
          return
        }
        backgroundImageUrl = mapBackgroundMapsLink.trim()
      }

      if (mapBackgroundSource === 'upload') {
        if (!mapBackgroundFile) {
          toast.error('Selecciona una imagen para subir')
          return
        }

        setUploadingBackground(true)
        backgroundImageUrl = await condominiumMapService.uploadBackgroundImage(mapBackgroundFile)
        setUploadingBackground(false)
      }

      await condominiumMapService.create({
        ...mapForm,
        condominiumId: selectedCondominium,
        backgroundImageUrl: backgroundImageUrl || null
      })
      toast.success('Mapa creado')
      setShowMapForm(false)
      setMapForm({
        condominiumId: selectedCondominium,
        name: '',
        description: '',
        scopeType: MapScopeType.Level,
        scopeReference: '',
        backgroundImageUrl: ''
      })
      setMapBackgroundSource('imageUrl')
      setMapBackgroundFile(null)
      setMapBackgroundMapsLink('')
      await loadMaps(selectedCondominium)
    } catch {
      setUploadingBackground(false)
      toast.error('No se pudo crear el mapa')
    }
  }

  const handleDeleteMap = async () => {
    if (!selectedMapId) return
    if (!confirm('¿Eliminar este mapa?')) return

    try {
      await condominiumMapService.delete(selectedMapId)
      toast.success('Mapa eliminado')
      await loadMaps(selectedCondominium)
    } catch {
      toast.error('No se pudo eliminar el mapa')
    }
  }

  const handleCreateMarker = async () => {
    if (!selectedMapId || !markerForm.label.trim() || !markerForm.layerName.trim()) {
      toast.error('Etiqueta y capa son obligatorios')
      return
    }

    try {
      await condominiumMapService.createMarker(selectedMapId, markerForm)
      toast.success('Marcador creado')
      setShowMarkerForm(false)
      setMarkerForm(markerDefaults)
      await loadMapDetail(selectedMapId)
    } catch {
      toast.error('No se pudo crear el marcador')
    }
  }

  const handleDeleteMarker = async (markerId: string) => {
    if (!confirm('¿Eliminar este marcador?')) return
    try {
      await condominiumMapService.deleteMarker(markerId)
      toast.success('Marcador eliminado')
      await loadMapDetail(selectedMapId)
    } catch {
      toast.error('No se pudo eliminar el marcador')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mapa del Condominio</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Mapas por nivel, edificio, sección o agrupación personalizada</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowMapForm(true)} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo mapa</button>
          <button onClick={() => setShowMarkerForm(true)} disabled={!selectedMapId} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold inline-flex items-center gap-2"><MapPin className="w-4 h-4" /> Nuevo marcador</button>
          <button onClick={handleDeleteMap} disabled={!selectedMapId} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Eliminar mapa</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Condominio</label>
          <select className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={selectedCondominium} onChange={e => setSelectedCondominium(e.target.value)}>
            {condominiums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400">Mapa</label>
          <select className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={selectedMapId} onChange={e => setSelectedMapId(e.target.value)}>
            <option value="">Selecciona</option>
            {maps.map(m => <option key={m.id} value={m.id}>{m.name} ({m.scopeTypeName}: {m.scopeReference})</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <div className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-600 dark:text-gray-300 inline-flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {mapDetail ? `${visibleMarkers.length} marcadores visibles` : 'Sin mapa seleccionado'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2"><Layers className="w-4 h-4" /> Capas</h3>
          <div className="mt-3 space-y-2">
            {mapDetail?.layers.map(layer => (
              <label key={layer.layerName} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{layer.layerName}</span>
                <input
                  type="checkbox"
                  checked={layersEnabled[layer.layerName] ?? layer.enabledByDefault}
                  onChange={e => setLayersEnabled(prev => ({ ...prev, [layer.layerName]: e.target.checked }))}
                />
              </label>
            ))}
            {!mapDetail && <p className="text-sm text-gray-500">Selecciona un mapa</p>}
          </div>
        </div>

        <div className="xl:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 aspect-[16/9] overflow-hidden">
            {mapDetail?.backgroundImageUrl && !isMapsLink(mapDetail.backgroundImageUrl) && (
              <img src={mapDetail.backgroundImageUrl} alt="map" className="absolute inset-0 w-full h-full object-cover opacity-70" />
            )}

            {mapDetail?.backgroundImageUrl && isMapsLink(mapDetail.backgroundImageUrl) && (
              isEmbeddableMapsUrl(mapDetail.backgroundImageUrl)
                ? <iframe src={mapDetail.backgroundImageUrl} className="absolute inset-0 w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <a href={mapDetail.backgroundImageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 text-sky-700 font-semibold border border-sky-200 hover:bg-white">
                      Abrir mapa en Google Maps
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )
            )}

            {visibleMarkers.map(marker => (
              <div
                key={marker.id}
                title={marker.tooltip || marker.label}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${marker.coordinateX}%`, top: `${marker.coordinateY}%` }}
              >
                <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: marker.markerColor }} />
                <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 mt-2 z-10 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded">
                  {marker.label} · {markerTypeNames[marker.markerType]}
                </div>
              </div>
            ))}

            {!mapDetail && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                Selecciona o crea un mapa para comenzar
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">
            {mapDetail?.markers.map(marker => (
              <div key={marker.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{marker.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{marker.layerName} · {markerTypeNames[marker.markerType]} · ({marker.coordinateX}, {marker.coordinateY})</p>
                </div>
                <button onClick={() => handleDeleteMarker(marker.id)} className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300">Eliminar</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showMapForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowMapForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 dark:border-gray-700"><h2 className="font-bold text-gray-900 dark:text-white">Nuevo mapa</h2></div>
            <div className="p-5 space-y-3">
              <input value={mapForm.name} onChange={e => setMapForm(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="Nombre" />
              <textarea value={mapForm.description || ''} onChange={e => setMapForm(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="Descripción" rows={2} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={mapForm.scopeType} onChange={e => setMapForm(prev => ({ ...prev, scopeType: Number(e.target.value) as MapScopeType }))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                  <option value={MapScopeType.Level}>Nivel</option>
                  <option value={MapScopeType.Building}>Edificio</option>
                  <option value={MapScopeType.Section}>Sección</option>
                  <option value={MapScopeType.CustomGroup}>Agrupación personalizada</option>
                </select>
                <input value={mapForm.scopeReference} onChange={e => setMapForm(prev => ({ ...prev, scopeReference: e.target.value }))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="Referencia (ej. Torre A / Nivel 2)" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fuente del mapa</label>
                <select value={mapBackgroundSource} onChange={e => setMapBackgroundSource(e.target.value as MapBackgroundSource)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                  <option value="imageUrl">URL de imagen</option>
                  <option value="upload">Subir imagen</option>
                  <option value="mapsLink">Link de Google Maps</option>
                </select>
              </div>

              {mapBackgroundSource === 'imageUrl' && (
                <input value={mapForm.backgroundImageUrl || ''} onChange={e => setMapForm(prev => ({ ...prev, backgroundImageUrl: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="URL imagen de fondo (opcional)" />
              )}

              {mapBackgroundSource === 'upload' && (
                <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={e => setMapBackgroundFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              )}

              {mapBackgroundSource === 'mapsLink' && (
                <input value={mapBackgroundMapsLink} onChange={e => setMapBackgroundMapsLink(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="https://www.google.com/maps/..." />
              )}
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button onClick={() => setShowMapForm(false)} className="flex-1 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">Cancelar</button>
              <button onClick={handleCreateMap} disabled={uploadingBackground} className="flex-1 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold">{uploadingBackground ? 'Subiendo...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {showMarkerForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowMarkerForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 dark:border-gray-700"><h2 className="font-bold text-gray-900 dark:text-white">Nuevo marcador</h2></div>
            <div className="p-5 space-y-3">
              <input value={markerForm.label} onChange={e => setMarkerForm(prev => ({ ...prev, label: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="Etiqueta" />
              <input value={markerForm.tooltip || ''} onChange={e => setMarkerForm(prev => ({ ...prev, tooltip: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="Tooltip" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={markerForm.markerType} onChange={e => setMarkerForm(prev => ({ ...prev, markerType: Number(e.target.value) as CondominiumMarkerType }))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
                  {Object.values(CondominiumMarkerType).filter(v => typeof v === 'number').map(v => (
                    <option key={v} value={v}>{markerTypeNames[v as number]}</option>
                  ))}
                </select>
                <input value={markerForm.layerName} onChange={e => setMarkerForm(prev => ({ ...prev, layerName: e.target.value }))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="Capa" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" step="0.1" min={0} max={100} value={markerForm.coordinateX} onChange={e => setMarkerForm(prev => ({ ...prev, coordinateX: Number(e.target.value) }))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="X (%)" />
                <input type="number" step="0.1" min={0} max={100} value={markerForm.coordinateY} onChange={e => setMarkerForm(prev => ({ ...prev, coordinateY: Number(e.target.value) }))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" placeholder="Y (%)" />
                <input type="color" value={markerForm.markerColor} onChange={e => setMarkerForm(prev => ({ ...prev, markerColor: e.target.value }))} className="h-10 px-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
              </div>
              <label className="text-sm inline-flex items-center gap-2">
                <input type="checkbox" checked={markerForm.layerEnabledByDefault} onChange={e => setMarkerForm(prev => ({ ...prev, layerEnabledByDefault: e.target.checked }))} />
                Capa activa por defecto
              </label>
            </div>
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button onClick={() => setShowMarkerForm(false)} className="flex-1 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">Cancelar</button>
              <button onClick={handleCreateMarker} className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Guardar marcador</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
