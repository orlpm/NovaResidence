import { apiClient } from './apiClient'

interface WrappedResponse<T> {
  data?: T
  message?: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber?: string
  role?: string
}

export interface RegisterResponse {
  userId: string
  email: string
  firstName: string
  lastName: string
  token: string
}

export const authService = {
  async register(request: RegisterRequest): Promise<WrappedResponse<RegisterResponse>> {
    const response = await apiClient.post<WrappedResponse<RegisterResponse>>('/auth/register', request)
    return response.data
  },

  async forgotPassword(email: string): Promise<{ message?: string; Message?: string }> {
    const response = await apiClient.post<{ message?: string; Message?: string }>('/auth/forgot-password', { email })
    return response.data
  },

  async confirmEmail(userId: string, token: string): Promise<{ message?: string }> {
    const response = await apiClient.get<{ message?: string }>('/auth/confirm-email', {
      params: { userId, token }
    })
    return response.data
  },

  async resendEmailConfirmation(email: string): Promise<{ message?: string }> {
    const response = await apiClient.post<{ message?: string }>('/auth/resend-email-confirmation', { email })
    return response.data
  },

  async resetPassword(userId: string, token: string, newPassword: string): Promise<{ message?: string }> {
    const response = await apiClient.post<{ message?: string }>('/auth/reset-password', {
      userId,
      token,
      newPassword
    })
    return response.data
  }
}