import { apiClient } from './apiClient';

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  defaultRole: string;
  isActive: boolean;
  isEmailConfirmed: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface UserHierarchy {
  role: number;
  roleName: string;
  level: number;
  canManageRoles: number[];
  userCount: number;
  color: string;
}

export interface StaffRoleAssignment {
  condominiumId: string;
  role: string;
}

export interface StaffUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  defaultRole: string;
  isActive: boolean;
  assignedTasksCount: number;
  createdAt?: string;
  condominiumRoles: StaffRoleAssignment[];
}

export interface CreateStaffUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'Maintenance' | 'SecurityGuard' | 'Cleaning';
  condominiumId: string;
}

export interface UpdateStaffUserRequest {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'Maintenance' | 'SecurityGuard' | 'Cleaning';
  condominiumId: string;
}

// Role configuration with hierarchy
export const ROLE_CONFIG: Record<number, { name: string; level: number; color: string; canManage: number[] }> = {
  0: { name: 'Super Admin', level: 0, color: 'purple', canManage: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  1: { name: 'Administrador', level: 1, color: 'blue', canManage: [2, 3, 4, 5, 6, 7, 8, 9] },
  2: { name: 'Sub-Administrador', level: 2, color: 'indigo', canManage: [3, 4, 5, 6] },
  3: { name: 'Propietario', level: 3, color: 'green', canManage: [4] },
  4: { name: 'Inquilino', level: 4, color: 'teal', canManage: [] },
  5: { name: 'Vigilancia', level: 3, color: 'orange', canManage: [] },
  6: { name: 'Mantenimiento', level: 3, color: 'yellow', canManage: [] },
  7: { name: 'Proveedor', level: 3, color: 'gray', canManage: [] },
  8: { name: 'Contador', level: 2, color: 'emerald', canManage: [] },
  9: { name: 'Limpieza', level: 3, color: 'cyan', canManage: [] }
};

export const userManagementService = {
  // Get all users from API
  getUsers: async (): Promise<UserListItem[]> => {
    try {
      const response = await apiClient.get<UserListItem[]>('/auth/users');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  // Get user hierarchy stats
  getUserHierarchy: async (): Promise<UserHierarchy[]> => {
    const hierarchy: UserHierarchy[] = Object.entries(ROLE_CONFIG).map(([roleNum, config]) => ({
      role: parseInt(roleNum),
      roleName: config.name,
      level: config.level,
      canManageRoles: config.canManage,
      userCount: 0,
      color: config.color
    }));
    return hierarchy;
  },

  // Reset user password (SuperAdmin only)
  resetPassword: async (userId: string, newPassword: string): Promise<{ message: string; email: string }> => {
    try {
      const response = await apiClient.post<{ message: string; email: string }>('/auth/admin-reset-password', {
        userId,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  // Activate user
  activateUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/auth/users/${userId}/activate`);
  },

  // Deactivate user
  deactivateUser: async (userId: string): Promise<void> => {
    await apiClient.post(`/auth/users/${userId}/deactivate`);
  },

  // Delete user
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/auth/users/${userId}`);
  },

  // Resend verification email
  resendVerificationEmail: async (userId: string): Promise<void> => {
    // TODO: Implement real API call
    console.log('Resending verification to:', userId);
  },

  // Get staff users (maintenance, security, cleaning)
  getStaffUsers: async (condominiumId?: string): Promise<StaffUserItem[]> => {
    const query = condominiumId ? `?condominiumId=${encodeURIComponent(condominiumId)}` : '';
    const response = await apiClient.get<StaffUserItem[]>(`/auth/staff-users${query}`);
    return response.data || [];
  },

  // Create staff user
  createStaffUser: async (request: CreateStaffUserRequest): Promise<{ message: string; userId: string; role: string }> => {
    const response = await apiClient.post<{ message: string; userId: string; role: string }>('/auth/staff-users', request);
    return response.data;
  },

  updateStaffUser: async (userId: string, request: UpdateStaffUserRequest): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>(`/auth/staff-users/${userId}`, request);
    return response.data;
  },

  activateStaffUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/auth/staff-users/${userId}/activate`);
    return response.data;
  },

  deactivateStaffUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/auth/staff-users/${userId}/deactivate`);
    return response.data;
  },

  deleteStaffUser: async (userId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/auth/staff-users/${userId}`);
    return response.data;
  }
};
