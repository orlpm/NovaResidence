import axios from 'axios'

export const DEFAULT_API_TIMEOUT_MS = 15000

export interface DisplayableApiError extends Error {
  code?: string
  status?: number
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined
  }

  const payload = error.response?.data as { code?: string } | undefined
  return typeof payload?.code === 'string' ? payload.code : undefined
}

export function getApiErrorMessage(error: unknown, fallback = 'No se pudo completar la solicitud.'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return 'La solicitud tardó demasiado. Verifica tu conexión e inténtalo de nuevo.'
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión o inténtalo de nuevo más tarde.'
    }

    const payload = error.response.data as
      | { message?: string; error?: string; errors?: Record<string, string[] | string> | string[] }
      | undefined

    const directMessage = payload?.message || payload?.error
    if (typeof directMessage === 'string' && directMessage.trim()) {
      return directMessage
    }

    if (Array.isArray(payload?.errors)) {
      const firstArrayMessage = payload.errors.find((value) => typeof value === 'string' && value.trim())
      if (firstArrayMessage) {
        return firstArrayMessage
      }
    }

    if (payload?.errors && typeof payload.errors === 'object') {
      const firstObjectMessage = Object.values(payload.errors).flat().find((value) => typeof value === 'string' && value.trim())
      if (typeof firstObjectMessage === 'string') {
        return firstObjectMessage
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

export function toDisplayableApiError(error: unknown, fallback = 'No se pudo completar la solicitud.'): DisplayableApiError {
  const displayableError = new Error(getApiErrorMessage(error, fallback)) as DisplayableApiError
  if (axios.isAxiosError(error)) {
    displayableError.code = getApiErrorCode(error)
    displayableError.status = error.response?.status
  }

  return displayableError
}