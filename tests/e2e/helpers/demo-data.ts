const CONDOMINIUM_NAMES = [
  'Residencial Los Pinos',
  'Parque Central',
  'Jardines del Lago',
  'Vista del Roble',
  'Bosques del Valle',
  'Mirador de la Alameda'
]

const BUILDING_NAMES = [
  'Torre Jacarandas',
  'Torre Cedros',
  'Torre Magnolias',
  'Torre Naranjos',
  'Torre Olivos',
  'Torre Laureles'
]

const PEOPLE = [
  { firstName: 'Laura', lastName: 'Mendez' },
  { firstName: 'Carlos', lastName: 'Herrera' },
  { firstName: 'Sofia', lastName: 'Navarro' },
  { firstName: 'Daniel', lastName: 'Campos' },
  { firstName: 'Paula', lastName: 'Rojas' },
  { firstName: 'Marco', lastName: 'Vega' }
]

function hashText(value: string): number {
  let hash = 0

  for (const char of value) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  }

  return Math.abs(hash)
}

function pick<T>(value: string, items: T[]): T {
  return items[hashText(value) % items.length]
}

function compactNumber(seed: number): string {
  return String((Math.abs(seed) % 90) + 10).padStart(2, '0')
}

function compactUnit(seed: number, key: string): string {
  const wing = ['A', 'B', 'C'][hashText(key) % 3]
  const floor = (Math.abs(seed) % 5) + 1
  const door = String(((Math.floor(Math.abs(seed) / 7) % 8) + 1)).padStart(2, '0')
  return `${wing}-${floor}${door}`
}

function humanizePrefix(prefix: string): string {
  return prefix
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildScenarioProfile(prefix: string, seed: number = Date.now()) {
  const scenarioKey = `${prefix}-${seed}`
  const person = pick(`${scenarioKey}-person`, PEOPLE)
  const suffix = compactNumber(seed)

  return {
    condominiumName: `${pick(`${scenarioKey}-condo`, CONDOMINIUM_NAMES)} ${suffix}`,
    condominiumDescription: `Escenario automatizado de ${humanizePrefix(prefix)}`,
    buildingName: `${pick(`${scenarioKey}-building`, BUILDING_NAMES)} ${suffix}`,
    unitNumber: compactUnit(seed, scenarioKey),
    residentFirstName: person.firstName,
    residentLastName: `${person.lastName} ${suffix}`,
    adminFirstName: 'Ana',
    adminLastName: `Morales ${suffix}`,
    readableLabel: humanizePrefix(prefix)
  }
}