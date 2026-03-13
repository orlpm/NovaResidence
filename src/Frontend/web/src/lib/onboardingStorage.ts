import type { OnboardingData } from '../types/onboarding'

export const ONBOARDING_WIZARD_DATA_KEY = 'onboarding_wizard_data'
export const ONBOARDING_WIZARD_STATE_KEY = 'onboarding_wizard_state'

export type SavedOnboardingState = {
  currentStep: number
  data: OnboardingData
  userId?: string
}

function sameUserId(left?: string, right?: string) {
  if (!left || !right) {
    return false
  }

  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

export function loadSavedOnboardingState(userId?: string): SavedOnboardingState | null {
  try {
    const rawState = localStorage.getItem(ONBOARDING_WIZARD_STATE_KEY)
    if (rawState) {
      const parsed = JSON.parse(rawState) as SavedOnboardingState
      if (
        parsed?.data &&
        typeof parsed.currentStep === 'number' &&
        (!userId || !parsed.userId || sameUserId(parsed.userId, userId))
      ) {
        return parsed
      }
    }

    const rawData = localStorage.getItem(ONBOARDING_WIZARD_DATA_KEY)
    if (!rawData) return null

    const data = JSON.parse(rawData) as OnboardingData
    return {
      currentStep: 1,
      data,
      userId
    }
  } catch {
    return null
  }
}

export function saveOnboardingState(state: SavedOnboardingState) {
  localStorage.setItem(ONBOARDING_WIZARD_STATE_KEY, JSON.stringify(state))
  localStorage.setItem(ONBOARDING_WIZARD_DATA_KEY, JSON.stringify(state.data))
}

export function clearOnboardingState() {
  localStorage.removeItem(ONBOARDING_WIZARD_STATE_KEY)
}
