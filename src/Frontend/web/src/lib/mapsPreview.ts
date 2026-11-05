export function isGoogleMapsLink(url?: string | null): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    const path = parsed.pathname.toLowerCase()
    if (host === 'maps.app.goo.gl') return true
    if (host === 'goo.gl') return path.startsWith('/maps')
    const googleHost = host === 'maps.google.com' || host === 'google.com' || host.endsWith('.google.com') || host.endsWith('.google.com.mx')
    return googleHost && (path.includes('/maps') || parsed.searchParams.has('q') || parsed.searchParams.has('query'))
  } catch {
    return false
  }
}

export function googleMapsEmbedUrl(url?: string | null): string | null {
  if (!url || !isGoogleMapsLink(url)) return null
  const trimmed = url.trim()
  if (trimmed.includes('/maps/embed')) return trimmed

  const at = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (at) return `https://maps.google.com/maps?q=${at[1]},${at[2]}&z=16&output=embed`

  try {
    const parsed = new URL(trimmed)
    const query = parsed.searchParams.get('q') || parsed.searchParams.get('query') || parsed.searchParams.get('ll')
    if (query) return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`

    const place = parsed.pathname.match(/\/maps\/(?:place|search)\/([^/@]+)/i)
    if (place) {
      const name = decodeURIComponent(place[1]).replace(/\+/g, ' ').trim()
      if (name) return `https://maps.google.com/maps?q=${encodeURIComponent(name)}&z=16&output=embed`
    }
  } catch {
    return null
  }

  return null
}
