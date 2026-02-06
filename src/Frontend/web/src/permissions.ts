// Export all permission-related functionality

// Constants
export { PERMISSIONS } from './config/permissions';
export { ROLE_CONFIG, ROLE_NAVIGATION, UserRole } from './config/roles';

// Hooks
export { 
  usePermissions, 
  useHasPermission, 
  useHasAnyPermission, 
  useHasAllPermissions 
} from './hooks/usePermissions';

// Components
export { 
  PermissionGate, 
  PermissionCheck, 
  ConditionalPermission 
} from './components/shared/PermissionGate';

export { PermissionRoute } from './components/routing/PermissionRoute';

// Services
export { permissionService } from './lib/permissionService';
export type { Permission } from './lib/permissionService';

// Types
export type { PermissionCode } from './config/permissions';
export type { UsePermissionsResult } from './hooks/usePermissions';
