import { apiClient } from './apiClient'

// Enums - Must match backend NovaResidence.Domain.Enums.FeeType
export enum FeeType {
  MonthlyMaintenance = 0,
  ExtraordinaryFee = 1,
  ParkingFee = 2,
  ReservationFee = 3,
  LateFee = 4,
  Fine = 5,
  Utility = 6,
  Insurance = 7,
  Other = 99
}

export enum ChargeStatus {
  Pending = 0,
  PartiallyPaid = 1,
  Paid = 2,
  Overdue = 3,
  Cancelled = 4,
  Forgiven = 5
}

export enum PaymentMethod {
  Cash = 0,
  Check = 1,
  BankTransfer = 2,
  CreditCard = 3,
  DebitCard = 4,
  DirectDebit = 5,
  Other = 6
}

export enum InvoiceStatus {
  Draft = 0,
  Issued = 1,
  PartiallyPaid = 2,
  Paid = 3,
  Cancelled = 4
}

// Type display names for UI
export const feeTypeNames: Record<FeeType, string> = {
  [FeeType.MonthlyMaintenance]: 'Mantenimiento Mensual',
  [FeeType.ExtraordinaryFee]: 'Cuota Extraordinaria',
  [FeeType.ParkingFee]: 'Estacionamiento',
  [FeeType.ReservationFee]: 'Reservación',
  [FeeType.LateFee]: 'Recargo por Mora',
  [FeeType.Fine]: 'Penalización/Multa',
  [FeeType.Utility]: 'Servicios',
  [FeeType.Insurance]: 'Seguro',
  [FeeType.Other]: 'Otro'
}

export const chargeStatusNames: Record<ChargeStatus, string> = {
  [ChargeStatus.Pending]: 'Pendiente',
  [ChargeStatus.PartiallyPaid]: 'Parcialmente Pagado',
  [ChargeStatus.Paid]: 'Pagado',
  [ChargeStatus.Overdue]: 'Vencido',
  [ChargeStatus.Cancelled]: 'Cancelado',
  [ChargeStatus.Forgiven]: 'Condonado'
}

export const paymentMethodNames: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Efectivo',
  [PaymentMethod.Check]: 'Cheque',
  [PaymentMethod.BankTransfer]: 'Transferencia Bancaria',
  [PaymentMethod.CreditCard]: 'Tarjeta de Crédito',
  [PaymentMethod.DebitCard]: 'Tarjeta de Débito',
  [PaymentMethod.DirectDebit]: 'Domiciliación',
  [PaymentMethod.Other]: 'Otro'
}

export const invoiceStatusNames: Record<InvoiceStatus, string> = {
  [InvoiceStatus.Draft]: 'Borrador',
  [InvoiceStatus.Issued]: 'Emitida',
  [InvoiceStatus.PartiallyPaid]: 'Parcialmente Pagada',
  [InvoiceStatus.Paid]: 'Pagada',
  [InvoiceStatus.Cancelled]: 'Cancelada'
}

// DTOs
export interface PaymentDto {
  id: string
  amount: number
  paymentMethod: PaymentMethod
  paymentMethodName: string
  referenceNumber: string | null
  paymentDate: string
  isVerified: boolean
  verifiedAt: string | null
  isRefunded: boolean
  refundedAt: string | null
  refundReason: string | null
}

export interface ChargeListDto {
  id: string
  unitId: string
  unitNumber: string
  buildingName: string
  concept: string
  feeType: FeeType
  feeTypeName: string
  amount: number
  paidAmount: number
  balance: number
  status: ChargeStatus
  statusName: string
  isOverdue: boolean
  dueDate: string
  billingPeriodMonth: number
  billingPeriodYear: number
  createdAt: string
}

export interface ChargeDetailDto extends ChargeListDto {
  condominiumId: string
  unitId: string
  residentId: string | null
  residentName: string | null
  description: string | null
  cancellationReason: string | null
  forgiveReason: string | null
  applyLateFee: boolean
  lateFeePercentage: number | null
  lateFeeAmount: number | null
  lateFeeAppliedAt: string | null
  createdAt: string
  payments: PaymentDto[]
}

export interface UnitBalanceDto {
  unitId: string
  unitNumber: string
  totalCharged: number
  totalPaid: number
  balance: number
  overdueAmount: number
  pendingCharges: number
}

export interface BillingSummaryDto {
  totalCharged: number
  totalCollected: number
  totalPending: number
  totalOverdue: number
  collectionRate: number
  chargesByType: { feeType: FeeType; feeTypeName: string; amount: number }[]
  paymentsByMethod: { paymentMethod: PaymentMethod; methodName: string; amount: number }[]
}

export interface FeeConfigurationDto {
  id: string
  name: string
  description: string | null
  feeType: FeeType
  feeTypeName: string
  defaultAmount: number
  isRecurring: boolean
  recurringDay: number | null
  dueDayOffset: number | null
  applyLateFee: boolean
  lateFeePercentage: number | null
  gracePeriodDays: number | null
  isActive: boolean
}

// Request DTOs
export interface CreateChargeRequest {
  condominiumId: string
  unitId: string
  concept: string
  feeType: FeeType
  amount: number
  dueDate: string
  billingPeriodMonth: number
  billingPeriodYear: number
  residentId?: string | null
  description?: string | null
  applyLateFee?: boolean
  lateFeePercentage?: number | null
}

export interface CreateBulkChargesRequest {
  condominiumId: string
  concept: string
  feeType: FeeType
  amount: number
  dueDate: string
  billingPeriodMonth: number
  billingPeriodYear: number
  applyLateFee?: boolean
  lateFeePercentage?: number | null
}

export interface CancelChargeRequest {
  reason: string
}

export interface ForgiveChargeRequest {
  reason: string
}

export interface RecordPaymentRequest {
  chargeId: string
  amount: number
  paymentMethod: PaymentMethod
  paymentDate?: string | null
  receivedById?: string | null
  referenceNumber?: string | null
  notes?: string | null
}

export interface VerifyPaymentRequest {
  verifiedById: string
}

export interface RefundPaymentRequest {
  reason: string
  refundedById: string
}

export interface CreateFeeConfigurationRequest {
  condominiumId: string
  name: string
  feeType: FeeType
  defaultAmount: number
  isRecurring?: boolean
  recurringDay?: number | null
  dueDayOffset?: number | null
  applyLateFee?: boolean
  lateFeePercentage?: number | null
  gracePeriodDays?: number | null
  description?: string | null
}

export interface UpdateFeeConfigurationRequest {
  name: string
  defaultAmount: number
  recurringDay?: number | null
  dueDayOffset?: number | null
  applyLateFee: boolean
  lateFeePercentage?: number | null
  gracePeriodDays?: number | null
  description?: string | null
}

export interface GenerateMonthlyChargesRequest {
  condominiumId: string
  month: number
  year: number
}

// API Service
export const billingService = {
  // ============ Charges ============

  // Get charge by ID
  async getCharge(id: string): Promise<ChargeDetailDto> {
    const response = await apiClient.get<ChargeDetailDto>(`/billing/charges/${id}`)
    return response.data
  },

  // Get charges for a condominium
  async getCondominiumCharges(
    condominiumId: string,
    filters?: {
      month?: number
      year?: number
      status?: ChargeStatus
      feeType?: FeeType
    }
  ): Promise<ChargeListDto[]> {
    const params = new URLSearchParams()
    if (filters?.month !== undefined) params.append('month', filters.month.toString())
    if (filters?.year !== undefined) params.append('year', filters.year.toString())
    if (filters?.status !== undefined) params.append('status', filters.status.toString())
    if (filters?.feeType !== undefined) params.append('feeType', filters.feeType.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await apiClient.get<ChargeListDto[]>(
      `/billing/charges/condominium/${condominiumId}${query}`
    )
    return response.data
  },

  // Get charges for a unit
  async getUnitCharges(
    unitId: string,
    filters?: {
      month?: number
      year?: number
      status?: ChargeStatus
    }
  ): Promise<ChargeListDto[]> {
    const params = new URLSearchParams()
    if (filters?.month !== undefined) params.append('month', filters.month.toString())
    if (filters?.year !== undefined) params.append('year', filters.year.toString())
    if (filters?.status !== undefined) params.append('status', filters.status.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await apiClient.get<ChargeListDto[]>(`/billing/charges/unit/${unitId}${query}`)
    return response.data
  },

  // Get overdue charges
  async getOverdueCharges(condominiumId: string): Promise<ChargeListDto[]> {
    const response = await apiClient.get<ChargeListDto[]>(
      `/billing/charges/overdue/${condominiumId}`
    )
    return response.data
  },

  // Create a single charge
  async createCharge(request: CreateChargeRequest): Promise<string> {
    const response = await apiClient.post<string>('/billing/charges', request)
    return response.data
  },

  // Create bulk charges for all units
  async createBulkCharges(request: CreateBulkChargesRequest): Promise<number> {
    const response = await apiClient.post<number>('/billing/charges/bulk', request)
    return response.data
  },

  // Cancel a charge
  async cancelCharge(id: string, request: CancelChargeRequest): Promise<void> {
    await apiClient.post(`/billing/charges/${id}/cancel`, request)
  },

  // Forgive a charge
  async forgiveCharge(id: string, request: ForgiveChargeRequest): Promise<void> {
    await apiClient.post(`/billing/charges/${id}/forgive`, request)
  },

  // Delete a single charge
  async deleteCharge(id: string): Promise<void> {
    await apiClient.delete(`/billing/charges/${id}`)
  },

  // Delete multiple charges by condominium (optionally filtered by month/year)
  async deleteChargesByCondominium(
    condominiumId: string,
    filters?: { month?: number; year?: number }
  ): Promise<number> {
    const params = new URLSearchParams()
    if (filters?.month !== undefined) params.append('month', filters.month.toString())
    if (filters?.year !== undefined) params.append('year', filters.year.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await apiClient.delete<number>(
      `/billing/charges/condominium/${condominiumId}${query}`
    )
    return response.data
  },

  // Apply late fee to a charge
  async applyLateFee(id: string): Promise<void> {
    await apiClient.post(`/billing/charges/${id}/apply-late-fee`)
  },

  // ============ Payments ============

  // Record a payment
  async recordPayment(request: RecordPaymentRequest): Promise<string> {
    const response = await apiClient.post<string>('/billing/payments', request)
    return response.data
  },

  // Verify a payment
  async verifyPayment(id: string, request: VerifyPaymentRequest): Promise<void> {
    await apiClient.post(`/billing/payments/${id}/verify`, request)
  },

  // Refund a payment
  async refundPayment(id: string, request: RefundPaymentRequest): Promise<void> {
    await apiClient.post(`/billing/payments/${id}/refund`, request)
  },

  // ============ Balances ============

  // Get balance for a unit
  async getUnitBalance(unitId: string): Promise<UnitBalanceDto> {
    const response = await apiClient.get<UnitBalanceDto>(`/billing/balance/unit/${unitId}`)
    return response.data
  },

  // Get balances for all units in a condominium
  async getCondominiumBalances(condominiumId: string): Promise<UnitBalanceDto[]> {
    const response = await apiClient.get<UnitBalanceDto[]>(
      `/billing/balances/condominium/${condominiumId}`
    )
    return response.data
  },

  // Get billing summary for a condominium
  async getBillingSummary(
    condominiumId: string,
    month: number,
    year: number
  ): Promise<BillingSummaryDto> {
    const response = await apiClient.get<BillingSummaryDto>(
      `/billing/summary/${condominiumId}?month=${month}&year=${year}`
    )
    return response.data
  },

  // ============ Fee Configurations ============

  // Get fee configurations for a condominium
  async getFeeConfigurations(condominiumId: string): Promise<FeeConfigurationDto[]> {
    const response = await apiClient.get<FeeConfigurationDto[]>(
      `/billing/fee-configurations/${condominiumId}`
    )
    return response.data
  },

  // Create a fee configuration
  async createFeeConfiguration(request: CreateFeeConfigurationRequest): Promise<string> {
    const response = await apiClient.post<string>('/billing/fee-configurations', request)
    return response.data
  },

  // Update a fee configuration
  async updateFeeConfiguration(
    id: string,
    request: UpdateFeeConfigurationRequest
  ): Promise<void> {
    await apiClient.put(`/billing/fee-configurations/${id}`, request)
  },

  // Toggle fee configuration active status
  async toggleFeeConfiguration(id: string): Promise<void> {
    await apiClient.post(`/billing/fee-configurations/${id}/toggle`)
  },

  // Delete a fee configuration
  async deleteFeeConfiguration(id: string): Promise<void> {
    await apiClient.delete(`/billing/fee-configurations/${id}`)
  },

  // Delete all fee configurations for a condominium
  async deleteAllFeeConfigurations(condominiumId: string): Promise<number> {
    const response = await apiClient.delete<number>(
      `/billing/fee-configurations/condominium/${condominiumId}`
    )
    return response.data
  },

  // Generate monthly charges
  async generateMonthlyCharges(request: GenerateMonthlyChargesRequest): Promise<number> {
    const response = await apiClient.post<number>('/billing/generate-monthly', request)
    return response.data
  }
}
