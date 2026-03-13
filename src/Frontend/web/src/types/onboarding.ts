export interface OnboardingData {
  // Admin Info
  admin?: {
    email: string
    password: string
    firstName: string
    lastName: string
    phoneNumber: string
  }
  // Plan Selection
  selectedPlan?: 'basico' | 'profesional' | 'empresarial'
  plan?: {
    name: string
    price: number
    period: string
  }
  // Condominium Info
  condominium: {
    name: string
    address: string
    city: string
    state: string
    stateId?: string
    zipCode: string
    country?: string
    countryId?: string
    sections?: string[]
  }
  // Building Type
  buildingTypes: {
    vertical: boolean
    horizontal: boolean
  }
  // Units
  buildings: Array<{
    id: string
    name: string
    type: 'vertical' | 'horizontal'
    section?: string
    numberOfUnits: number
    startsAtGroundFloor?: boolean
    units: Array<{
      number: string
      floor?: number
      isCommercial: boolean
      area?: number
    }>
  }>
  // Invitation Method
  invitationMethod: 'link' | 'manual'
  // Residents
  residents?: Array<{
    unitId: string
    email: string
    firstName: string
    lastName: string
    isOwner: boolean
  }>
}
