import { apiClient } from './apiClient'

// Enums
export enum PaymentProofStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2
}

export enum PaymentMethod {
  Cash = 0,
  BankTransfer = 1,
  CreditCard = 2,
  DebitCard = 3,
  Check = 4,
  SPEI = 5,
  PayPal = 6,
  Other = 99
}

// Display names
export const paymentProofStatusNames: Record<PaymentProofStatus, string> = {
  [PaymentProofStatus.Pending]: 'Pendiente',
  [PaymentProofStatus.Approved]: 'Aprobado',
  [PaymentProofStatus.Rejected]: 'Rechazado'
}

export const paymentMethodNames: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Efectivo',
  [PaymentMethod.BankTransfer]: 'Transferencia Bancaria',
  [PaymentMethod.CreditCard]: 'Tarjeta de Crédito',
  [PaymentMethod.DebitCard]: 'Tarjeta de Débito',
  [PaymentMethod.Check]: 'Cheque',
  [PaymentMethod.SPEI]: 'SPEI',
  [PaymentMethod.PayPal]: 'PayPal',
  [PaymentMethod.Other]: 'Otro'
}

// DTOs
export interface PaymentProofListDto {
  id: string
  condominiumId: string
  unitId: string
  unitNumber: string
  buildingName: string | null
  chargeId: string
  chargeConcept: string
  chargeAmount: number
  amount: number
  paymentMethod: PaymentMethod
  paymentMethodName: string
  referenceNumber: string | null
  paymentDate: string
  bankName: string | null
  originalFileName: string
  notes: string | null
  status: PaymentProofStatus
  statusName: string
  submittedAt: string
  submittedByName: string
  reviewedAt: string | null
  reviewedByName: string | null
  reviewComments: string | null
}

export interface PaymentProofDetailDto extends PaymentProofListDto {
  fileName: string
  filePath: string
  contentType: string
  fileSize: number
  chargeBalance: number
  submittedById: string
  reviewedById: string | null
  paymentId: string | null
}

export interface PagedList<T> {
  items: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface SubmitPaymentProofRequest {
  condominiumId: string
  unitId: string
  chargeId: string
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string
  referenceNumber?: string
  bankName?: string
  notes?: string
  file: File
}

// Service
export const paymentProofService = {
  // Get payment proofs for a condominium (Admin)
  getCondominiumPaymentProofs: async (
    condominiumId: string,
    params?: {
      status?: PaymentProofStatus
      page?: number
      pageSize?: number
    }
  ): Promise<PagedList<PaymentProofListDto>> => {
    const searchParams = new URLSearchParams()
    if (params?.status !== undefined) searchParams.append('status', params.status.toString())
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    
    const queryString = searchParams.toString() ? `?${searchParams}` : ''
    const response = await apiClient.get<PagedList<PaymentProofListDto>>(
      `/paymentproofs/condominium/${condominiumId}${queryString}`
    )
    return response.data
  },

  // Get payment proofs for a unit (Resident)
  getUnitPaymentProofs: async (
    unitId: string,
    params?: {
      status?: PaymentProofStatus
      page?: number
      pageSize?: number
    }
  ): Promise<PagedList<PaymentProofListDto>> => {
    const searchParams = new URLSearchParams()
    if (params?.status !== undefined) searchParams.append('status', params.status.toString())
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    
    const queryString = searchParams.toString() ? `?${searchParams}` : ''
    const response = await apiClient.get<PagedList<PaymentProofListDto>>(
      `/paymentproofs/unit/${unitId}${queryString}`
    )
    return response.data
  },

  // Get payment proof details
  getPaymentProof: async (id: string): Promise<PaymentProofDetailDto> => {
    const response = await apiClient.get<PaymentProofDetailDto>(`/paymentproofs/${id}`)
    return response.data
  },

  // Get file download URL
  getFileUrl: (id: string): string => {
    return `${apiClient.defaults.baseURL}/paymentproofs/${id}/file`
  },

  // Submit payment proof (Resident uploads bank receipt)
  submitPaymentProof: async (request: SubmitPaymentProofRequest): Promise<string> => {
    const formData = new FormData()
    formData.append('condominiumId', request.condominiumId)
    formData.append('unitId', request.unitId)
    formData.append('chargeId', request.chargeId)
    formData.append('amount', request.amount.toString())
    formData.append('paymentMethod', request.paymentMethod.toString())
    formData.append('paymentDate', request.paymentDate)
    if (request.referenceNumber) formData.append('referenceNumber', request.referenceNumber)
    if (request.bankName) formData.append('bankName', request.bankName)
    if (request.notes) formData.append('notes', request.notes)
    formData.append('file', request.file)

    const response = await apiClient.post<string>('/paymentproofs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // Approve payment proof (Admin)
  approvePaymentProof: async (id: string, comments?: string): Promise<void> => {
    await apiClient.post(`/paymentproofs/${id}/approve`, { comments })
  },

  // Reject payment proof (Admin)
  rejectPaymentProof: async (id: string, reason: string): Promise<void> => {
    await apiClient.post(`/paymentproofs/${id}/reject`, { reason })
  }
}

export default paymentProofService
