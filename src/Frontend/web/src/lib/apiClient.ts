import axios, { AxiosInstance } from 'axios'
import { useAuthStore } from '../stores/authStore'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:5001/api'

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
        const { accessToken } = useAuthStore.getState()
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            await useAuthStore.getState().refreshAccessToken()
            const { accessToken } = useAuthStore.getState()
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

  delete<T>(url: string, config = {}) {
    return this.client.delete<T>(url, config)
  }
}

export const apiClient = new ApiClient()
