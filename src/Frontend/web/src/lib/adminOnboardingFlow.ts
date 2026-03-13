import type { User } from '../stores/authStore'
import { clearOnboardingState, loadSavedOnboardingState } from './onboardingStorage'

export const ADMIN_REGISTRATION_DATA_KEY = 'admin_registration_data'
const ADMIN_ONBOARDING_STATUS_PREFIX = 'admin_onboarding_status:'

export interface AdminRegistrationData {
  userId?: string
  selectedPlan?: string
  admin?: {
    email?: string
    firstName?: string
    lastName?: string
    phoneNumber?: string
  }
}

function sameUserId(left?: string, right?: string) {
  if (!left || !right) {
    return false
  }

  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function getAdminOnboardingStatusKey(userId: string) {
  return `${ADMIN_ONBOARDING_STATUS_PREFIX}${userId}`
}

export function getAdminRegistrationData(): AdminRegistrationData | null {
  const rawData = localStorage.getItem(ADMIN_REGISTRATION_DATA_KEY)
  if (!rawData) {
    return null
  }

  try {
    return JSON.parse(rawData) as AdminRegistrationData
  } catch {
    localStorage.removeItem(ADMIN_REGISTRATION_DATA_KEY)
    return null
  }
}

export function saveAdminRegistrationData(data: AdminRegistrationData) {
  localStorage.setItem(ADMIN_REGISTRATION_DATA_KEY, JSON.stringify(data))
}

export function clearAdminRegistrationData(userId?: string) {
  const current = getAdminRegistrationData()
  if (!current) {
    return
  }

  if (!userId || !current.userId || sameUserId(current.userId, userId)) {
    localStorage.removeItem(ADMIN_REGISTRATION_DATA_KEY)
  }
}

export function markAdminOnboardingCompleted(userId?: string) {
  if (!userId) {
    return
  }

  localStorage.setItem(getAdminOnboardingStatusKey(userId), 'completed')
  clearAdminRegistrationData(userId)
  clearOnboardingState()
}

export function hasCompletedAdminOnboarding(userId?: string) {
  if (!userId) {
    return false
  }

  return localStorage.getItem(getAdminOnboardingStatusKey(userId)) === 'completed'
}

export function isAdminProfile(user?: Pick<User, 'id' | 'role' | 'defaultRole'> | null) {
  if (!user) {
    return false
  }

  const normalizedRole = (user.role || '').toLowerCase()
  const normalizedDefaultRole = (user.defaultRole || '').replace(/[^a-z]/gi, '').toLowerCase()

  return normalizedRole === 'admin' && normalizedDefaultRole !== 'subadmin'
}

export function hasPendingAdminOnboarding(user?: Pick<User, 'id' | 'role' | 'defaultRole'> | null) {
  if (!user?.id || !isAdminProfile(user) || hasCompletedAdminOnboarding(user.id)) {
    return false
  }

  const registrationData = getAdminRegistrationData()
  if (sameUserId(registrationData?.userId, user.id)) {
    return true
  }

  const savedState = loadSavedOnboardingState(user.id)
  return !!savedState
}

export function getPostLoginRoute(user: User, requestedPath?: string | null) {
  const role = user.role?.toLowerCase() || user.defaultRole?.toLowerCase()
  const normalizedDefaultRole = (user.defaultRole || '').replace(/[^a-z]/gi, '').toLowerCase()

  if (requestedPath && isAdminProfile(user)) {
    return requestedPath
  }

  if (requestedPath && role !== 'admin') {
    return requestedPath
  }

  if (hasPendingAdminOnboarding(user)) {
    return '/admin/onboarding'
  }

  if (role === 'superadmin') {
    return '/superadmin'
  }

  if (role === 'subadmin' || (role === 'admin' && normalizedDefaultRole === 'subadmin')) {
    return '/subadmin'
  }

  if (role === 'admin') {
    return '/admin'
  }

  if (role === 'security' || role === 'securityguard') {
    return '/security'
  }

  if (role === 'maintenance') {
    return '/maintenance'
  }

  if (role === 'cleaning') {
    return '/cleaning'
  }

  if (role === 'provider' || normalizedDefaultRole === 'serviceprovider' || normalizedDefaultRole === 'provider') {
    return '/provider'
  }

  if (role === 'accountant') {
    return '/accountant'
  }

  return '/resident'
}