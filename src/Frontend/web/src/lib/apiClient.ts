import axios, { AxiosInstance } from 'axios'
import { useAuthStore } from '../stores/authStore'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5001/api'

const isLikelyJwt = (token?: string | null): token is string => {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  return parts.length === 3 && parts.every(p => p.length > 0)
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
          if (config.headers) {
            delete (config.headers as any)['Content-Type']
            delete (config.headers as any)['content-type']
          }
        }

        const { accessToken } = useAuthStore.getState()
        if (isLikelyJwt(accessToken)) {
          config.headers.Authorization = `Bearer ${accessToken}`
        } else if (accessToken) {
          useAuthStore.getState().logout()
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for token refresh and subscription blocking
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        // Handle 402 Payment Required — subscription expired
        if (error.response?.status === 402) {
          // Dispatch a custom event that the SubscriptionGuard can listen to
          window.dispatchEvent(new CustomEvent('subscription:payment-required', {
            detail: error.response.data
          }));
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            await useAuthStore.getState().refreshAccessToken()
            const { accessToken } = useAuthStore.getState()
            if (!isLikelyJwt(accessToken)) {
              useAuthStore.getState().logout()
              return Promise.reject(error)
            }
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return this.client(originalRequest)
          } catch (refreshError) {
            useAuthStore.getState().logout()
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  get<T>(url: string, config = {}) {
    return this.client.get<T>(url, config)
  }

  post<T>(url: string, data?: unknown, config = {}) {
    return this.client.post<T>(url, data, config)
  }

  put<T>(url: string, data?: unknown, config = {}) {
    return this.client.put<T>(url, data, config)
  }

  patch<T>(url: string, data?: unknown, config = {}) {
    return this.client.patch<T>(url, data, config)
  }

  delete<T>(url: string, config = {}) {
    return this.client.delete<T>(url, config)
  }
}

export const apiClient = new ApiClient()
