import { useEffect, useMemo, useState } from 'react'
import { Camera, ExternalLink, MapPinned, VideoOff } from 'lucide-react'
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService'
import { condominiumMapService, type CondominiumMapMarkerDto } from '../../lib/condominiumMapService'
import { useAuthStore } from '../../stores/authStore'

interface CameraFeed {
  id: string
  mapName: string
  label: string
  location: string
  sourceUrl: string | null
  isActive: boolean
}

const cameraPattern = /(camera|cámara|camara|cctv|vigilancia)/i

function isCameraMarker(marker: CondominiumMapMarkerDto): boolean {
  return (
    cameraPattern.test(marker.layerName || '') ||
    cameraPattern.test(marker.label || '') ||
    cameraPattern.test(marker.tooltip || '') ||
    cameraPattern.test(marker.externalReference || '')
  )
}

function parseCameraUrl(marker: CondominiumMapMarkerDto): string | null {
  const candidates = [marker.externalReference, marker.tooltip]
  for (const candidate of candidates) {
    if (candidate && /^https?:\/\//i.test(candidate.trim())) {
      return candidate.trim()
    }
  }
  return null
}

export default function SecurityCameras() {
  const { user } = useAuthStore()
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([])
  const [selectedCondominium, setSelectedCondominium] = useState('')
  const [feeds, setFeeds] = useState<CameraFeed[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCondominiums = async () => {
      try {
        const data = await condominiumService.getAllCondominiums(user?.id)
        setCondominiums(data)
        if (data.length > 0) {
          setSelectedCondominium(data[0].id)
        }
      } catch {
        setError('No se pudieron cargar los condominios')
      }
    }

    loadCondominiums()
  }, [user?.id])

  useEffect(() => {
    const loadFeeds = async () => {
      if (!selectedCondominium) return
      setLoading(true)
      setError(null)
      try {
        const maps = await condominiumMapService.getByCondominium(selectedCondominium)
        const details = await Promise.all(maps.map(m => condominiumMapService.getById(m.id)))

        const extractedFeeds = details.flatMap((map) =>
          map.markers
            .filter(marker => marker.isActive && isCameraMarker(marker))
            .map((marker) => ({
              id: marker.id,
              mapName: map.name,
              label: marker.label,
              location: marker.layerName,
              sourceUrl: parseCameraUrl(marker),
              isActive: marker.isActive
            }))
        )

        setFeeds(extractedFeeds)
      } catch {
        setError('No se pudo cargar la información de cámaras')
      } finally {
        setLoading(false)
      }
    }

    loadFeeds()
  }, [selectedCondominium])

  const withUrlCount = useMemo(() => feeds.filter(f => !!f.sourceUrl).length, [feeds])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cámaras</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Inventario operativo de puntos de cámara registrados en mapas del condominio.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 p-4">
          {error}
        </div>
      )}

      <div className="max-w-xl">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condominio</label>
        <select
          value={selectedCondominium}
          onChange={(e) => setSelectedCondominium(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
        >
          {condominiums.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cámaras detectadas</p>
          <p className="text-3xl font-bold text-sky-600">{feeds.length}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Con URL de monitoreo</p>
          <p className="text-3xl font-bold text-green-600">{withUrlCount}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Sin enlace</p>
          <p className="text-3xl font-bold text-amber-600">{feeds.length - withUrlCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500 dark:text-gray-400">Cargando cámaras...</div>
      ) : feeds.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
          <VideoOff className="mx-auto mb-3 w-10 h-10" />
          No hay cámaras configuradas en los mapas (capas/etiquetas con “camera/cámara/cctv”).
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {feeds.map(feed => (
            <div key={feed.id} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{feed.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mapa: {feed.mapName}</p>
                </div>
                <Camera className="w-5 h-5 text-sky-600" />
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2 mb-3">
                <MapPinned className="w-4 h-4" />
                {feed.location || 'Sin capa'}
              </div>

              {feed.sourceUrl ? (
                <a
                  href={feed.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700"
                >
                  Abrir fuente
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <p className="text-sm text-amber-600">Sin URL de monitoreo</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
