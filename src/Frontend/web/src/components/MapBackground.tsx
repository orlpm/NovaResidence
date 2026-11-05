import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { condominiumMapService } from '../lib/condominiumMapService'
import { googleMapsEmbedUrl, isGoogleMapsLink } from '../lib/mapsPreview'

function useMapsEmbed(url?: string | null) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const trimmed = url?.trim() ?? ''
    const local = googleMapsEmbedUrl(trimmed)
    if (!trimmed || !isGoogleMapsLink(trimmed)) {
      setEmbedUrl(null)
      setPending(false)
      return
    }
    if (local) {
      setEmbedUrl(local)
      setPending(false)
      return
    }

    let cancelled = false
    setPending(true)
    const timer = window.setTimeout(() => {
      condominiumMapService.resolveMapsLink(trimmed)
        .then(resolved => {
          if (!cancelled) setEmbedUrl(googleMapsEmbedUrl(resolved))
        })
        .catch(() => {
          if (!cancelled) setEmbedUrl(null)
        })
        .finally(() => {
          if (!cancelled) setPending(false)
        })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [url])

  return { embedUrl, pending }
}

export function MapBackground({ url }: { url?: string | null }) {
  const { embedUrl, pending } = useMapsEmbed(url)
  const mapsLink = isGoogleMapsLink(url)

  if (embedUrl) {
    return (
      <>
        <iframe
          src={embedUrl}
          title="Vista previa de Google Maps"
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white/90 px-3 py-1.5 text-sm font-semibold text-sky-700 hover:bg-white"
          >
            Abrir en Google Maps
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </>
    )
  }

  if (pending) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
        Cargando vista previa...
      </div>
    )
  }

  if (mapsLink && url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white/90 px-4 py-2 font-semibold text-sky-700 hover:bg-white"
        >
          Abrir mapa en Google Maps
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    )
  }

  if (url) {
    return <img src={url} alt="map" className="absolute inset-0 h-full w-full object-cover opacity-70" />
  }

  return null
}
