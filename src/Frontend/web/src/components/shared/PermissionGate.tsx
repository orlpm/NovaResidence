import { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionCode } from '../../config/permissions';
import { Loader2, ShieldX } from 'lucide-react';

interface PermissionGateProps {
  children: ReactNode;
  permissions: PermissionCode | PermissionCode[];
  condominiumId?: string;
  requireAll?: boolean; // If true, requires ALL permissions. If false, requires ANY
  fallback?: ReactNode;
  showDenied?: boolean; // Show denied message instead of hiding
  loadingFallback?: ReactNode;
}

export function PermissionGate({
  children,
  permissions,
  condominiumId,
  requireAll = false,
  fallback = null,
  showDenied = false,
  loadingFallback
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions(condominiumId);

  if (loading) {
    if (loadingFallback) return <>{loadingFallback}</>;
    
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Convert single permission to array
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];

  // Check permissions based on requireAll flag
  const hasAccess = requireAll
    ? hasAllPermissions(permissionArray)
    : permissionArray.length === 1
    ? hasPermission(permissionArray[0])
    : hasAnyPermission(permissionArray);

  if (!hasAccess) {
    if (showDenied) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <ShieldX className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Acceso Denegado
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No tienes permisos para acceder a esta sección
          </p>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Utility component for inline permission checks
interface PermissionCheckProps {
  permission: PermissionCode;
  condominiumId?: string;
  children: (hasPermission: boolean) => ReactNode;
}

export function PermissionCheck({ permission, condominiumId, children }: PermissionCheckProps) {
  const { hasPermission: checkPermission, loading } = usePermissions(condominiumId);
  
  if (loading) return null;
  
  return <>{children(checkPermission(permission))}</>;
}

// Component to show different content based on permission
interface ConditionalPermissionProps {
  permission: PermissionCode;
  condominiumId?: string;
  allowed: ReactNode;
  denied?: ReactNode;
}

export function ConditionalPermission({
  permission,
  condominiumId,
  allowed,
  denied = null
}: ConditionalPermissionProps) {
  const { hasPermission, loading } = usePermissions(condominiumId);

  if (loading) return null;

  return <>{hasPermission(permission) ? allowed : denied}</>;
}
