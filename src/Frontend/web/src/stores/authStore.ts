import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5001/api'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'superadmin' | 'admin' | 'resident' | 'provider' | 'security' | 'maintenance' | 'accountant' | 'cleaning'
  defaultRole?: string
  condominiumId?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password
          })

          const responseData = response.data
          console.log('🔐 Login response:', responseData)

          // Handle wrapped response { success, data, message }
          const data = responseData.data || responseData
          
          // El backend puede devolver User anidado o datos directos
          const userData = data.User || data.user || data
          
          const user: User = {
            id: userData.Id || userData.id || data.userId,
            email: userData.Email || userData.email || email,
            firstName: userData.FirstName || userData.firstName || '',
            lastName: userData.LastName || userData.lastName || '',
            role: ((userData.Role || userData.role || data.defaultRole || 'resident').toLowerCase()) as 'superadmin' | 'admin' | 'resident' | 'provider' | 'security' | 'maintenance' | 'accountant' | 'cleaning',
            defaultRole: userData.Role || userData.role || data.defaultRole,
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
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      register: async (data: RegisterData) => {
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!response.ok) throw new Error('Registration failed')

          // Auto-login after registration
          await get().login(data.email, data.password)
        } catch (error) {
          console.error('Registration error:', error)
          throw error
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          get().logout()
          return
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })

          if (!response.ok) throw new Error('Token refresh failed')

          const data = await response.json()
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          })
        } catch (error) {
          console.error('Token refresh error:', error)
          get().logout()
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
