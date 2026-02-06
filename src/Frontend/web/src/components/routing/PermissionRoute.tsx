import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionCode } from '../../config/permissions';
import { Loader2 } from 'lucide-react';

interface PermissionRouteProps {
  children: ReactNode;
  permissions: PermissionCode | PermissionCode[];
  condominiumId?: string;
  requireAll?: boolean;
  redirectTo?: string;
}

export function PermissionRoute({
  children,
  permissions,
  condominiumId,
  requireAll = false,
  redirectTo = '/unauthorized'
}: PermissionRouteProps) {
  const { permissions: userPermissions, hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions(condominiumId);

  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];

  // Debug logging
  console.log('[PermissionRoute] Loading:', loading);
  console.log('[PermissionRoute] Required permissions:', permissionArray);
  console.log('[PermissionRoute] User permissions count:', userPermissions.length);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  const hasAccess = requireAll
    ? hasAllPermissions(permissionArray)
    : permissionArray.length === 1
    ? hasPermission(permissionArray[0])
    : hasAnyPermission(permissionArray);

  console.log('[PermissionRoute] Has access:', hasAccess);
  console.log('[PermissionRoute] User permissions:', userPermissions.slice(0, 5), '...');

  if (!hasAccess) {
    console.log('[PermissionRoute] Redirecting to:', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
