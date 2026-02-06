import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { permissionService } from '../lib/permissionService';
import { PermissionCode, PERMISSIONS } from '../config/permissions';

// Default permissions for admin roles when API fails
const ADMIN_DEFAULT_PERMISSIONS = Object.values(PERMISSIONS);

export interface UsePermissionsResult {
  permissions: string[];
  loading: boolean;
  error: string | null;
  hasPermission: (code: PermissionCode) => boolean;
  hasAnyPermission: (codes: PermissionCode[]) => boolean;
  hasAllPermissions: (codes: PermissionCode[]) => boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(condominiumId?: string): UsePermissionsResult {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userPermissions = await permissionService.getUserPermissions(
        user.id,
        condominiumId
      );
      
      // If API returns empty and user is admin, use fallback permissions
      // This handles new admin users who haven't been assigned to a condominium yet
      if (userPermissions.length === 0 && (user?.role === 'admin' || user?.role === 'superadmin')) {
        console.warn('Admin user has no permissions yet, using fallback');
        setPermissions(ADMIN_DEFAULT_PERMISSIONS);
      } else {
        setPermissions(userPermissions);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError('Error al cargar permisos');
      // Fallback: Grant all permissions to admin users when API fails
      // This allows the UI to function while backend issues are resolved
      if (user?.role === 'admin' || user?.role === 'superadmin') {
        console.warn('Using fallback permissions for admin user');
        setPermissions(ADMIN_DEFAULT_PERMISSIONS);
      } else {
        setPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, condominiumId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (code: PermissionCode): boolean => {
      return permissions.includes(code);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (codes: PermissionCode[]): boolean => {
      return codes.some(code => permissions.includes(code));
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (codes: PermissionCode[]): boolean => {
      return codes.every(code => permissions.includes(code));
    },
    [permissions]
  );

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch: fetchPermissions
  };
}

// Hook to check a specific permission (returns loading state)
export function useHasPermission(permissionCode: PermissionCode, condominiumId?: string) {
  const { hasPermission, loading } = usePermissions(condominiumId);
  return { hasPermission: hasPermission(permissionCode), loading };
}

// Hook for multiple permissions with OR logic
export function useHasAnyPermission(permissionCodes: PermissionCode[], condominiumId?: string) {
  const { hasAnyPermission, loading } = usePermissions(condominiumId);
  return { hasPermission: hasAnyPermission(permissionCodes), loading };
}

// Hook for multiple permissions with AND logic
export function useHasAllPermissions(permissionCodes: PermissionCode[], condominiumId?: string) {
  const { hasAllPermissions, loading } = usePermissions(condominiumId);
  return { hasPermission: hasAllPermissions(permissionCodes), loading };
}
