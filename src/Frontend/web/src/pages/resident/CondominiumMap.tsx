import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { residentService } from '../../lib/residentService'
import { condominiumMapService, markerTypeNames, type CondominiumMapDetailDto, type CondominiumMapListDto } from '../../lib/condominiumMapService'

const isMapsLink = (url?: string | null) => {
  if (!url) return false
  const lower = url.toLowerCase()
  return lower.includes('google.com/maps') || lower.includes('maps.app.goo.gl')
}

const isEmbeddableMapsUrl = (url?: string | null) => {
  if (!url) return false
  return url.includes('/maps/embed') || url.includes('/maps?')
}

export default function ResidentCondominiumMap() {
  const { user } = useAuthStore()
  const [maps, setMaps] = useState<CondominiumMapListDto[]>([])
  const [selectedMapId, setSelectedMapId] = useState('')
  const [mapDetail, setMapDetail] = useState<CondominiumMapDetailDto | null>(null)
  const [layersEnabled, setLayersEnabled] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadMaps()
  }, [user?.id])

  useEffect(() => {
    if (selectedMapId) {
      loadMapDetail(selectedMapId)
    }
  }, [selectedMapId])

  const visibleMarkers = useMemo(() => {
    if (!mapDetail) return []
    return mapDetail.markers.filter(marker => {
      const enabled = layersEnabled[marker.layerName]
      return marker.isActive && (enabled === undefined ? marker.layerEnabledByDefault : enabled)
    })
  }, [mapDetail, layersEnabled])

  const loadMaps = async () => {
    if (!user?.id) return
    try {
      const resident = await residentService.getResidentInfo(user.id)
      if (!resident?.condominiumId) {
        setMaps([])
        return
      }
      const data = await condominiumMapService.getByCondominium(resident.condominiumId)
      setMaps(data.filter(m => m.isActive))
      if (data.length > 0) {
        setSelectedMapId(data[0].id)
      }
    } catch {
      toast.error('No se pudieron cargar los mapas')
    }
  }

  const loadMapDetail = async (mapId: string) => {
    try {
      const detail = await condominiumMapService.getById(mapId)
      setMapDetail(detail)
      const next: Record<string, boolean> = {}
      detail.layers.forEach(layer => {
        next[layer.layerName] = layer.enabledByDefault
      })
      setLayersEnabled(next)
    } catch {
      toast.error('No se pudo cargar el mapa')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mapa del Condominio</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Visualiza áreas comunes, amenidades, edificios, viviendas y locales por capas</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <label className="text-xs text-gray-500 dark:text-gray-400">Mapa disponible</label>
        <select className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" value={selectedMapId} onChange={e => setSelectedMapId(e.target.value)}>
          <option value="">Selecciona</option>
          {maps.map(m => <option key={m.id} value={m.id}>{m.name} ({m.scopeTypeName}: {m.scopeReference})</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2"><Layers className="w-4 h-4" /> Capas</h3>
          <div className="mt-3 space-y-2">
            {mapDetail?.layers.map(layer => (
              <label key={layer.layerName} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{layer.layerName}</span>
                <input type="checkbox" checked={layersEnabled[layer.layerName] ?? layer.enabledByDefault} onChange={e => setLayersEnabled(prev => ({ ...prev, [layer.layerName]: e.target.checked }))} />
              </label>
            ))}
            {!mapDetail && <p className="text-sm text-gray-500">Sin datos</p>}
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
              <div key={marker.id} title={marker.tooltip || marker.label} className="absolute -translate-x-1/2 -translate-y-1/2 group" style={{ left: `${marker.coordinateX}%`, top: `${marker.coordinateY}%` }}>
                <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: marker.markerColor }} />
                <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 mt-2 z-10 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded">
                  {marker.label} · {markerTypeNames[marker.markerType]}
                </div>
              </div>
            ))}

            {!mapDetail && <div className="absolute inset-0 flex items-center justify-center text-gray-500">Selecciona un mapa para visualizarlo</div>}
          </div>

          {mapDetail && (
            <div className="mt-4 max-h-52 overflow-y-auto space-y-2">
              {visibleMarkers.map(marker => (
                <div key={marker.id} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm">
                  <p className="font-medium text-gray-900 dark:text-white">{marker.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{marker.layerName} · {markerTypeNames[marker.markerType]} · ({marker.coordinateX}, {marker.coordinateY})</p>
                  {marker.tooltip && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{marker.tooltip}</p>}
                </div>
              ))}
              {visibleMarkers.length === 0 && <p className="text-sm text-gray-500">No hay marcadores visibles con las capas activas</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
