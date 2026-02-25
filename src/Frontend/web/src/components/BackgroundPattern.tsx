import { useMemo } from 'react'
import { useTheme } from '../contexts/ThemeContext'

// ─── Types ───────────────────────────────────────────────────────────
export type PatternVariant =
  | 'community'   // Home / Landing
  | 'admin'       // Admin panel
  | 'auth'        // Login / Register
  | 'residential' // Resident panel
  | 'security'    // Security panel
  | 'maintenance' // Maintenance panel
  | 'finance'     // Accountant panel
  | 'superadmin'  // Super Admin panel
  | 'subadmin'    // Sub Admin panel

// ─── Seeded PRNG (deterministic per variant) ─────────────────────────
function createRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

// ─── SVG Icon Definitions (24×24 coordinate space, stroke-only) ─────
const ICONS: Record<string, string> = {
  house: [
    '<path d="M3 12l9-8 9 8"/>',
    '<rect x="5" y="12" width="14" height="9" rx="1"/>',
    '<rect x="9" y="16" width="6" height="5"/>',
  ].join(''),

  house2: [
    '<path d="M4 11l8-7 8 7"/>',
    '<rect x="6" y="11" width="12" height="10" rx="1"/>',
    '<circle cx="12" cy="16" r="2"/>',
  ].join(''),

  building: [
    '<rect x="3" y="3" width="8" height="19" rx="1"/>',
    '<rect x="13" y="7" width="8" height="15" rx="1"/>',
    '<rect x="5" y="6" width="2" height="2"/>',
    '<rect x="5" y="10" width="2" height="2"/>',
    '<rect x="5" y="14" width="2" height="2"/>',
    '<rect x="15" y="10" width="2" height="2"/>',
    '<rect x="15" y="14" width="2" height="2"/>',
  ].join(''),

  apartment: [
    '<rect x="2" y="2" width="20" height="20" rx="1"/>',
    '<rect x="5" y="5" width="3" height="3"/>',
    '<rect x="10" y="5" width="3" height="3"/>',
    '<rect x="16" y="5" width="3" height="3"/>',
    '<rect x="5" y="11" width="3" height="3"/>',
    '<rect x="10" y="11" width="3" height="3"/>',
    '<rect x="16" y="11" width="3" height="3"/>',
    '<rect x="10" y="17" width="4" height="5"/>',
  ].join(''),

  tree: [
    '<path d="M12 3C8 3 5 6 5 9.5S8 14 12 14s7-1.5 7-4.5S16 3 12 3z"/>',
    '<rect x="11" y="14" width="2" height="7"/>',
  ].join(''),

  pine: [
    '<path d="M12 2l-6 8h3l-4 6h3l-4 6h16l-4-6h3l-4-6h3z"/>',
    '<rect x="11" y="22" width="2" height="2"/>',
  ].join(''),

  heart: '<path d="M12 20s-7-5.75-7-10c0-2.76 2.24-5 5-5 1.55 0 2.95.7 3.88 1.82A4.98 4.98 0 0117 5c2.76 0 5 2.24 5 5 0 4.25-7 10-7 10z"/>',

  cloud: '<path d="M6 19h12a5 5 0 10-4.28-7.58 7 7 0 10-9.72 4.67A3.5 3.5 0 006 19z"/>',

  sun: [
    '<circle cx="12" cy="12" r="4"/>',
    '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  ].join(''),

  bicycle: [
    '<circle cx="5.5" cy="17.5" r="3.5"/>',
    '<circle cx="18.5" cy="17.5" r="3.5"/>',
    '<path d="M5.5 17.5l3-9.5h6l1.5 4 2.5 5.5"/>',
    '<path d="M14.5 12L12 7"/>',
    '<circle cx="12" cy="5" r="1.5"/>',
  ].join(''),

  person: [
    '<circle cx="12" cy="5" r="2.5"/>',
    '<path d="M12 7.5v6"/>',
    '<path d="M8 20l4-6 4 6"/>',
    '<path d="M7 12h10"/>',
  ].join(''),

  persons: [
    '<circle cx="8" cy="5" r="2"/>',
    '<circle cx="16" cy="5" r="2"/>',
    '<path d="M4 20l4-8 4 8M12 20l4-8 4 8"/>',
  ].join(''),

  bench: [
    '<path d="M3 14h18"/>',
    '<path d="M5 14v6M19 14v6"/>',
    '<rect x="7" y="10" width="10" height="4"/>',
  ].join(''),

  plant: [
    '<rect x="8" y="18" width="8" height="4" rx="1"/>',
    '<path d="M12 18v-5"/>',
    '<path d="M12 13c-3-1-5 1-5 3"/>',
    '<path d="M12 13c3-1 5 1 5 3"/>',
    '<path d="M12 10c-2-2-4-1-4 1"/>',
    '<path d="M12 10c2-2 4-1 4 1"/>',
  ].join(''),

  flower: [
    '<circle cx="12" cy="12" r="2.5"/>',
    '<circle cx="12" cy="6" r="2"/>',
    '<circle cx="17" cy="9" r="2"/>',
    '<circle cx="17" cy="15" r="2"/>',
    '<circle cx="12" cy="18" r="2"/>',
    '<circle cx="7" cy="15" r="2"/>',
    '<circle cx="7" cy="9" r="2"/>',
  ].join(''),

  star: '<path d="M12 2l2.94 6.34L22 9.24l-5 4.68L18.18 21 12 17.27 5.82 21 7 13.92l-5-4.68 7.06-.9z"/>',

  pin: [
    '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>',
    '<circle cx="12" cy="9" r="2.5"/>',
  ].join(''),

  envelope: [
    '<rect x="2" y="5" width="20" height="14" rx="2"/>',
    '<path d="M2 5l10 7 10-7"/>',
  ].join(''),

  camera: [
    '<rect x="2" y="7" width="20" height="13" rx="2"/>',
    '<path d="M7 7l2-4h6l2 4"/>',
    '<circle cx="12" cy="14" r="3"/>',
  ].join(''),

  gazebo: [
    '<path d="M2 10l10-7 10 7"/>',
    '<path d="M5 10v10M19 10v10"/>',
    '<path d="M3 20h18"/>',
    '<path d="M8 14h8v6H8z"/>',
  ].join(''),

  chart: [
    '<path d="M3 3v18h18"/>',
    '<path d="M7 17V12M11 17V8M15 17V14M19 17V10"/>',
  ].join(''),

  document: [
    '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>',
    '<path d="M14 2v6h6"/>',
    '<path d="M8 13h8M8 17h8M8 9h2"/>',
  ].join(''),

  gear: [
    '<circle cx="12" cy="12" r="3"/>',
    '<path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>',
  ].join(''),

  users: [
    '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>',
    '<circle cx="9" cy="7" r="4"/>',
    '<path d="M23 21v-2a4 4 0 00-3-3.87"/>',
    '<path d="M16 3.13a4 4 0 010 7.75"/>',
  ].join(''),

  calendar: [
    '<rect x="3" y="4" width="18" height="18" rx="2"/>',
    '<path d="M16 2v4M8 2v4M3 10h18"/>',
    '<rect x="7" y="13" width="2" height="2"/>',
    '<rect x="11" y="13" width="2" height="2"/>',
    '<rect x="15" y="13" width="2" height="2"/>',
    '<rect x="7" y="17" width="2" height="2"/>',
    '<rect x="11" y="17" width="2" height="2"/>',
  ].join(''),

  clipboard: [
    '<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>',
    '<rect x="8" y="2" width="8" height="4" rx="1"/>',
    '<path d="M8 12h8M8 16h6"/>',
  ].join(''),

  key: [
    '<circle cx="8" cy="8" r="4"/>',
    '<path d="M11.3 11.3l9 9"/>',
    '<path d="M16.5 16.5l2.5 2.5M14.5 18.5l2.5 2.5"/>',
  ].join(''),

  lock: [
    '<rect x="6" y="11" width="12" height="10" rx="2"/>',
    '<path d="M9 11V7a3 3 0 016 0v4"/>',
    '<circle cx="12" cy="16" r="1.5"/>',
  ].join(''),

  shield: '<path d="M12 2l8 4v5c0 5.5-3.84 10.74-8 12-4.16-1.26-8-6.5-8-12V6z"/>',

  eye: [
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>',
    '<circle cx="12" cy="12" r="3"/>',
  ].join(''),

  wrench: '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94z"/>',

  hammer: [
    '<path d="M15 12l-8.5 8.5a2.12 2.12 0 01-3-3L12 9"/>',
    '<path d="M17.64 4.36a4.5 4.5 0 00-6.36 0L9.86 5.79l8.49 1.86 1.65-1.65a1.5 1.5 0 00-2.36-1.64z"/>',
  ].join(''),

  lightbulb: [
    '<path d="M9 18h6"/>',
    '<path d="M10 22h4"/>',
    '<path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/>',
  ].join(''),

  coin: [
    '<circle cx="12" cy="12" r="10"/>',
    '<path d="M12 6v12M8 9h8M8 15h8"/>',
  ].join(''),

  calculator: [
    '<rect x="4" y="2" width="16" height="20" rx="2"/>',
    '<rect x="7" y="5" width="10" height="5" rx="1"/>',
    '<circle cx="8" cy="14" r="0.8"/>',
    '<circle cx="12" cy="14" r="0.8"/>',
    '<circle cx="16" cy="14" r="0.8"/>',
    '<circle cx="8" cy="18" r="0.8"/>',
    '<circle cx="12" cy="18" r="0.8"/>',
    '<circle cx="16" cy="18" r="0.8"/>',
  ].join(''),

  receipt: [
    '<path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2z"/>',
    '<path d="M8 8h8M8 12h8M8 16h4"/>',
  ].join(''),

  wallet: [
    '<rect x="2" y="6" width="20" height="14" rx="2"/>',
    '<path d="M2 10h20"/>',
    '<circle cx="18" cy="16" r="1"/>',
  ].join(''),

  server: [
    '<rect x="3" y="2" width="18" height="6" rx="1"/>',
    '<rect x="3" y="10" width="18" height="6" rx="1"/>',
    '<rect x="3" y="18" width="18" height="4" rx="1"/>',
    '<circle cx="7" cy="5" r="1"/>',
    '<circle cx="7" cy="13" r="1"/>',
  ].join(''),

  globe: [
    '<circle cx="12" cy="12" r="10"/>',
    '<path d="M2 12h20"/>',
    '<path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>',
  ].join(''),

  database: [
    '<ellipse cx="12" cy="5" rx="9" ry="3"/>',
    '<path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/>',
    '<path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>',
  ].join(''),

  network: [
    '<circle cx="12" cy="5" r="2"/>',
    '<circle cx="5" cy="19" r="2"/>',
    '<circle cx="19" cy="19" r="2"/>',
    '<path d="M12 7v4M7.5 17.5L11 13M16.5 17.5L13 13"/>',
    '<circle cx="12" cy="13" r="2"/>',
  ].join(''),
}

// ─── Icon sets per variant ──────────────────────────────────────────
const VARIANT_ICONS: Record<PatternVariant, string[]> = {
  community: [
    'house', 'house2', 'building', 'apartment', 'tree', 'pine', 'heart',
    'cloud', 'bicycle', 'person', 'persons', 'star', 'plant', 'bench',
    'pin', 'envelope', 'camera', 'flower', 'sun', 'gazebo',
  ],
  admin: [
    'building', 'apartment', 'chart', 'document', 'users', 'calendar',
    'clipboard', 'gear', 'star', 'pin', 'cloud', 'tree', 'person',
  ],
  auth: [
    'key', 'shield', 'lock', 'building', 'person', 'star', 'cloud',
    'heart', 'envelope', 'house',
  ],
  residential: [
    'house', 'house2', 'heart', 'tree', 'pine', 'plant', 'person',
    'persons', 'flower', 'sun', 'cloud', 'bench', 'bicycle', 'star',
    'gazebo',
  ],
  security: [
    'shield', 'camera', 'lock', 'key', 'eye', 'person', 'building',
    'star', 'cloud', 'pin',
  ],
  maintenance: [
    'wrench', 'hammer', 'gear', 'lightbulb', 'building', 'document',
    'person', 'calendar', 'pin', 'cloud', 'star', 'clipboard',
  ],
  finance: [
    'coin', 'chart', 'calculator', 'receipt', 'wallet', 'document',
    'building', 'calendar', 'star', 'users',
  ],
  superadmin: [
    'server', 'globe', 'database', 'network', 'shield', 'users',
    'chart', 'document', 'building', 'calendar', 'gear', 'key', 'star',
  ],
  subadmin: [
    'building', 'users', 'document', 'chart', 'calendar', 'envelope',
    'person', 'clipboard', 'star', 'pin', 'cloud', 'heart',
  ],
}

// ─── Deterministic seeds per variant ─────────────────────────────────
const VARIANT_SEEDS: Record<PatternVariant, number> = {
  community: 42,
  admin: 137,
  auth: 256,
  residential: 389,
  security: 512,
  maintenance: 678,
  finance: 789,
  superadmin: 901,
  subadmin: 1024,
}

// ─── Tile generator ──────────────────────────────────────────────────
function generateTileSvg(
  variant: PatternVariant,
  strokeColor: string,
): string {
  const random = createRandom(VARIANT_SEEDS[variant])
  const iconNames = VARIANT_ICONS[variant]
  const TILE = 800
  const COUNT = 50

  let elements = ''
  for (let i = 0; i < COUNT; i++) {
    const iconIndex = Math.floor(random() * iconNames.length)
    const iconName = iconNames[iconIndex]
    const svg = ICONS[iconName]
    if (!svg) continue

    const x = 20 + random() * (TILE - 40)
    const y = 20 + random() * (TILE - 40)
    const scale = 0.8 + random() * 0.8
    const rotation = -20 + random() * 40

    elements += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rotation.toFixed(1)}) scale(${scale.toFixed(2)})"><g transform="translate(-12,-12)">${svg}</g></g>`
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">`,
    `<g stroke="${strokeColor}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">`,
    elements,
    '</g></svg>',
  ].join('')
}

// ─── Hook: returns inline style to apply on any container div ────────
// Usage: <div style={bgStyle} className="min-h-screen bg-gray-50 ...">
// background-image renders ON TOP of background-color in CSS
export function useBackgroundPattern(variant: PatternVariant = 'community'): React.CSSProperties {
  const { effectiveTheme } = useTheme()
  const isDark = effectiveTheme === 'dark'

  return useMemo(() => {
    const color = isDark
      ? 'rgba(255,255,255,0.13)'
      : 'rgba(0,0,0,0.07)'
    const svgStr = generateTileSvg(variant, color)
    const uri = `data:image/svg+xml,${encodeURIComponent(svgStr)}`
    return {
      backgroundImage: `url("${uri}")`,
      backgroundRepeat: 'repeat' as const,
      backgroundSize: '800px 800px',
    }
  }, [variant, isDark])
}

// ─── Component wrapper (alternative usage) ──────────────────────────
interface BackgroundPatternProps {
  variant?: PatternVariant
  className?: string
  children?: React.ReactNode
  style?: React.CSSProperties
}

export default function BackgroundPattern({
  variant = 'community',
  className = '',
  children,
  style: extraStyle,
}: BackgroundPatternProps) {
  const bgStyle = useBackgroundPattern(variant)

  return (
    <div className={className} style={{ ...bgStyle, ...extraStyle }}>
      {children}
    </div>
  )
}
