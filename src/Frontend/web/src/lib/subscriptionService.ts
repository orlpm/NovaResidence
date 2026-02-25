import { apiClient } from './apiClient';

// ---- Types ----

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  pricePerUnit: number;
  minUnits: number;
  maxUnits: number | null;
  trialDays: number;
  isCustom: boolean;
  fixedMonthlyPrice: number | null;
  features: string; // JSON array string
  displayOrder: number;
  isRecommended: boolean;
}

export interface SubscriptionStatus {
  hasSubscription: boolean;
  isAccessGranted: boolean;
  status: string;
  statusText: string;
  monthlyAmount: number;
  billedUnits: number;
  daysRemaining: number;
  planName: string;
  currentPeriodEnd: string;
  trialEndDate: string | null;
}

export interface SubscriptionDetail {
  id: string;
  adminUserId: string;
  adminName: string;
  adminEmail: string;
  status: number;
  statusText: string;
  isAccessGranted: boolean;
  plan: {
    id: string;
    name: string;
    pricePerUnit: number;
    isCustom: boolean;
    fixedMonthlyPrice: number | null;
  };
  startDate: string;
  trialEndDate: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  billedUnits: number;
  currentUnits: number;
  monthlyAmount: number;
  lastPaymentDate: string | null;
  gracePeriodDays: number;
  daysRemaining: number;
  condominiums: { id: string; name: string }[];
  condominiumCount: number;
  recentPayments: SubscriptionPayment[];
}

export interface SubscriptionPayment {
  id: string;
  amount: number;
  monthsPaid: number;
  paymentMethod: string;
  referenceNumber: string | null;
  paymentDate: string;
  isVerified: boolean;
  proofUrl: string | null;
}

export interface PriceCalculation {
  planId: string;
  planName: string;
  pricePerUnit: number;
  monthlyTotal: number;
  annualTotal: number;
  isEligible: boolean;
  isRecommended: boolean;
}

export interface PaymentRequired {
  success: false;
  message: string;
  subscriptionStatus: string;
  planName: string | null;
  monthlyAmount: number;
  billedUnits: number;
  currentPeriodEnd: string | null;
  trialEndDate: string | null;
  requiresPayment: true;
}

export interface SubscriptionListItem {
  id: string;
  adminUserId: string;
  adminName: string;
  adminEmail: string;
  condominiumCount: number;
  status: number;
  statusText: string;
  planName: string;
  planPricePerUnit: number;
  monthlyAmount: number;
  billedUnits: number;
  startDate: string;
  trialEndDate: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  lastPaymentDate: string | null;
  gracePeriodDays: number;
  isAccessGranted: boolean;
  paymentMethod: string | null;
  totalPayments: number;
  daysRemaining: number;
}

// ---- Service ----

class SubscriptionService {
  /** Get all active subscription plans */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await apiClient.get<SubscriptionPlan[]>('/SubscriptionPlans');
    return response.data;
  }

  /** Get a specific plan */
  async getPlan(id: string): Promise<SubscriptionPlan> {
    const response = await apiClient.get<SubscriptionPlan>(`/SubscriptionPlans/${id}`);
    return response.data;
  }

  /** Calculate pricing for a number of units */
  async calculatePrice(units: number): Promise<PriceCalculation[]> {
    const response = await apiClient.get<PriceCalculation[]>(`/SubscriptionPlans/calculate?units=${units}`);
    return response.data;
  }

  /** Get subscription status for an admin user (lightweight) */
  async getStatus(userId: string): Promise<SubscriptionStatus> {
    const response = await apiClient.get<SubscriptionStatus>(`/Subscriptions/status/${userId}`);
    return response.data;
  }

  /** Get subscription for an admin user by their ID */
  async getSubscriptionByUser(userId: string): Promise<SubscriptionDetail> {
    const response = await apiClient.get<SubscriptionDetail>(`/Subscriptions/user/${userId}`);
    return response.data;
  }

  /** Get subscription for the currently logged-in admin */
  async getMySubscription(): Promise<SubscriptionDetail> {
    const response = await apiClient.get<SubscriptionDetail>(`/Subscriptions/my`);
    return response.data;
  }

  /** Create a new subscription for an admin user */
  async createSubscription(adminUserId: string, planId: string, unitCount: number) {
    const response = await apiClient.post('/Subscriptions', {
      adminUserId,
      planId,
      unitCount
    });
    return response.data;
  }

  /** Register a payment for a subscription */
  async registerPayment(
    subscriptionId: string,
    amount: number,
    monthsPaid: number = 1,
    paymentMethod: string = 'BankTransfer',
    referenceNumber?: string,
    notes?: string,
    proofUrl?: string
  ) {
    const response = await apiClient.post(`/Subscriptions/${subscriptionId}/payments`, {
      amount,
      monthsPaid,
      paymentMethod,
      referenceNumber,
      notes,
      proofUrl
    });
    return response.data;
  }

  /** Change plan for an existing subscription */
  async changePlan(subscriptionId: string, planId: string) {
    const response = await apiClient.post(`/Subscriptions/${subscriptionId}/change-plan`, {
      planId
    });
    return response.data;
  }

  /** Get all subscriptions (SuperAdmin) */
  async getAllSubscriptions(status?: string, page: number = 1, pageSize: number = 20) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    
    const response = await apiClient.get(`/Subscriptions?${params.toString()}`);
    return response.data;
  }

  /** Change subscription status (SuperAdmin) */
  async changeStatus(subscriptionId: string, newStatus: string, reason?: string) {
    const response = await apiClient.post(`/Subscriptions/${subscriptionId}/change-status`, {
      newStatus,
      reason
    });
    return response.data;
  }

  /** Extend a subscription by months and/or days (SuperAdmin) */
  async extendSubscription(subscriptionId: string, months: number, days: number = 0, reason?: string) {
    const response = await apiClient.post(`/Subscriptions/${subscriptionId}/extend`, {
      months,
      days,
      reason
    });
    return response.data;
  }

  /** Condone (forgive) pending payment — mark as active (SuperAdmin) */
  async condoneSubscription(subscriptionId: string, months: number, reason?: string) {
    const response = await apiClient.post(`/Subscriptions/${subscriptionId}/condone`, {
      months,
      reason
    });
    return response.data;
  }

  /** Parse features JSON string into array */
  parseFeatures(featuresJson: string): string[] {
    try {
      return JSON.parse(featuresJson);
    } catch {
      return [];
    }
  }
}

export const subscriptionService = new SubscriptionService();
