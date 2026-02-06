import { apiClient } from './apiClient';
import { PermissionCode } from '../config/permissions';

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  isSystem: boolean;
  isActive: boolean;
}

class PermissionService {
  private permissionsCache: Map<string, string[]> = new Map();
  private cacheExpiration: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    const response = await apiClient.get<Permission[]>('/permissions');
    return response.data;
  }

  /**
   * Get user's effective permissions
   */
  async getUserPermissions(userId: string, condominiumId?: string): Promise<string[]> {
    const cacheKey = `${userId}_${condominiumId || 'global'}`;
    
    // Check cache
    const cached = this.permissionsCache.get(cacheKey);
    const expiration = this.cacheExpiration.get(cacheKey);
    
    if (cached && expiration && Date.now() < expiration) {
      return cached;
    }

    // Fetch from API
    const params = condominiumId ? { condominiumId } : {};
    const response = await apiClient.get<string[]>(`/permissions/user/${userId}`, { params });
    const permissions = response.data;

    // Update cache
    this.permissionsCache.set(cacheKey, permissions);
    this.cacheExpiration.set(cacheKey, Date.now() + this.CACHE_DURATION);

    return permissions;
  }

  /**
   * Check if user has a specific permission
   */
  async checkPermission(
    userId: string, 
    permissionCode: PermissionCode, 
    condominiumId?: string
  ): Promise<boolean> {
    const params = condominiumId ? { condominiumId } : {};
    const response = await apiClient.get<{ hasPermission: boolean }>(
      `/permissions/user/${userId}/check/${permissionCode}`,
      { params }
    );
    return response.data.hasPermission;
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    permissionCodes: PermissionCode[],
    condominiumId?: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, condominiumId);
    return permissionCodes.some(code => userPermissions.includes(code));
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: string,
    permissionCodes: PermissionCode[],
    condominiumId?: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, condominiumId);
    return permissionCodes.every(code => userPermissions.includes(code));
  }

  /**
   * Grant permission to a user
   */
  async grantUserPermission(
    userId: string,
    permissionCode: string,
    condominiumId?: string,
    expiresAt?: Date,
    reason?: string
  ): Promise<void> {
    await apiClient.post(`/permissions/user/${userId}/grant`, {
      permissionCode,
      condominiumId,
      expiresAt: expiresAt?.toISOString(),
      reason
    });
    
    // Clear cache
    this.clearUserCache(userId);
  }

  /**
   * Revoke permission from a user
   */
  async revokeUserPermission(
    userId: string,
    permissionCode: string,
    condominiumId?: string,
    reason?: string
  ): Promise<void> {
    await apiClient.post(`/permissions/user/${userId}/revoke`, {
      permissionCode,
      condominiumId,
      reason
    });
    
    // Clear cache
    this.clearUserCache(userId);
  }

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(role: number): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/permissions/role/${role}`);
    return response.data;
  }

  /**
   * Grant permission to a role
   */
  async grantRolePermission(
    role: number,
    permissionCode: string,
    canOverride: boolean = true
  ): Promise<void> {
    await apiClient.post(`/permissions/role/${role}/grant`, {
      permissionCode,
      canOverride
    });
  }

  /**
   * Set condominium-specific role permission override
   */
  async setCondominiumRolePermission(
    condominiumId: string,
    role: number,
    permissionCode: string,
    isGranted: boolean
  ): Promise<void> {
    await apiClient.post(
      `/permissions/condominium/${condominiumId}/role/${role}/set`,
      { permissionCode, isGranted }
    );
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    this.permissionsCache.forEach((_, key) => {
      if (key.startsWith(userId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      this.permissionsCache.delete(key);
      this.cacheExpiration.delete(key);
    });
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.permissionsCache.clear();
    this.cacheExpiration.clear();
  }
}

export const permissionService = new PermissionService();
