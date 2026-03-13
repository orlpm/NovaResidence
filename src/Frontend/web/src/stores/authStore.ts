import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { DEFAULT_API_TIMEOUT_MS, toDisplayableApiError } from '../lib/apiErrors'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5001/api'
const authHttp = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'superadmin' | 'admin' | 'subadmin' | 'resident' | 'provider' | 'security' | 'maintenance' | 'accountant' | 'cleaning'
  defaultRole?: string
  condominiumId?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  logout: (optionsOrEvent?: { revokeRefreshToken?: boolean } | ReactMouseEvent<HTMLElement>) => Promise<void>
  clearAuthData: () => void
  register: (data: RegisterData) => Promise<void>
  refreshAccessToken: () => Promise<void>
  setAuthData: (user: User, accessToken: string, refreshToken?: string) => void
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber?: string
}

function normalizeRole(rawRole?: string): User['role'] {
  const role = (rawRole || '').toLowerCase().trim()

  if (role === 'superadmin') return 'superadmin'
  if (role === 'admin') return 'admin'
  if (role === 'subadmin') return 'subadmin'
  if (role === 'resident') return 'resident'
  if (role === 'serviceprovider' || role === 'provider' || role === 'proveedor') return 'provider'
  if (role === 'securityguard' || role === 'security' || role === 'vigilancia') return 'security'
  if (role === 'maintenance' || role === 'mantenimiento') return 'maintenance'
  if (role === 'accountant' || role === 'contador') return 'accountant'
  if (role === 'cleaning' || role === 'limpieza') return 'cleaning'

  return 'resident'
}

function isLogoutOptions(value: unknown): value is { revokeRefreshToken?: boolean } {
  return typeof value === 'object' && value !== null && 'revokeRefreshToken' in value
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await authHttp.post('/auth/login', {
            email,
            password
          })

          const responseData = response.data
          console.log('🔐 Login response:', responseData)

          // Handle wrapped response { success, data, message }
          const data = responseData.data || responseData
          
          // El backend puede devolver User anidado o datos directos
          const userData = data.User || data.user || data
          const normalizedDefaultRole = userData.DefaultRole || userData.defaultRole || data.defaultRole || data.DefaultRole || userData.Role || userData.role
          const roleSource = normalizedDefaultRole || userData.Role || userData.role
          
          const user: User = {
            id: userData.Id || userData.id || data.userId,
            email: userData.Email || userData.email || email,
            firstName: userData.FirstName || userData.firstName || '',
            lastName: userData.LastName || userData.lastName || '',
            role: normalizeRole(roleSource),
            defaultRole: normalizedDefaultRole,
            condominiumId: userData.CondominiumId || userData.condominiumId || data.condominiumId
          }

          set({
            user,
            accessToken: data.accessToken || data.AccessToken,
            refreshToken: data.refreshToken || data.RefreshToken,
            isAuthenticated: true,
          })
          
          return user
        } catch (error) {
          console.error('Login error:', error)
          throw toDisplayableApiError(error, 'Error al iniciar sesión')
        }
      },

      clearAuthData: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      logout: async (optionsOrEvent) => {
        const revokeRefreshToken = isLogoutOptions(optionsOrEvent)
          ? (optionsOrEvent.revokeRefreshToken ?? true)
          : true
        const { refreshToken, accessToken } = get()

        try {
          if (revokeRefreshToken && refreshToken) {
            await authHttp.post('/auth/logout', { refreshToken }, {
              headers: {
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              },
            })
          }
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          get().clearAuthData()
        }
      },

      register: async (data: RegisterData) => {
        try {
          await authHttp.post('/auth/register', data)

          // Auto-login after registration
          await get().login(data.email, data.password)
        } catch (error) {
          console.error('Registration error:', error)
          throw toDisplayableApiError(error, 'No se pudo completar el registro')
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          get().clearAuthData()
          return
        }

        try {
          const response = await authHttp.post('/auth/refresh', { refreshToken })
          const responseData = response.data
          const data = responseData.data || responseData
          set({
            accessToken: data.accessToken || data.AccessToken,
            refreshToken: data.refreshToken || data.RefreshToken,
          })
        } catch (error) {
          console.error('Token refresh error:', error)
          get().clearAuthData()
        }
      },

      setAuthData: (user: User, accessToken: string, refreshToken?: string) => {
        set({
          user,
          accessToken,
          refreshToken: refreshToken || null,
          isAuthenticated: true,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
