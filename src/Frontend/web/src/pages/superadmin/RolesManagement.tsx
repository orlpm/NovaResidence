import { useState, useEffect } from 'react';
import { Shield, Search, Users, ChevronDown, ChevronUp, Check, X, Edit2, Eye } from 'lucide-react';
import { permissionService, Permission } from '../../lib/permissionService';
import { ROLE_CONFIG, UserRole } from '../../config/roles';

interface RoleInfo {
  role: UserRole;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  permissionCount: number;
  totalPermissions: number;
  permissions: string[];
}

export default function RolesManagement() {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<UserRole | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [savingPermission, setSavingPermission] = useState<string | null>(null);

  // Load all permissions and role data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const permissions = await permissionService.getAllPermissions();
        setAllPermissions(permissions);

        // Load permissions for each role
        const roleEntries = Object.entries(ROLE_CONFIG).map(async ([roleKey, config]) => {
          const role = parseInt(roleKey) as UserRole;
          try {
            const perms = await permissionService.getRolePermissions(role);
            return {
              role,
              name: config.name,
              icon: config.icon,
              color: config.color,
              bgColor: config.bgColor,
              permissionCount: perms.length,
              totalPermissions: permissions.length,
              permissions: perms,
            };
          } catch {
            return {
              role,
              name: config.name,
              icon: config.icon,
              color: config.color,
              bgColor: config.bgColor,
              permissionCount: 0,
              totalPermissions: permissions.length,
              permissions: [],
            };
          }
        });

        const rolesData = await Promise.all(roleEntries);
        setRoles(rolesData);
      } catch (error) {
        console.error('Error loading roles data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle expanding a role to view its permissions
  const handleExpandRole = (role: UserRole) => {
    if (expandedRole === role) {
      setExpandedRole(null);
      setEditingRole(null);
    } else {
      setExpandedRole(role);
      setEditingRole(null);
      const roleData = roles.find(r => r.role === role);
      if (roleData) {
        setRolePermissions([...roleData.permissions]);
      }
    }
  };

  // Handle entering edit mode for a role
  const handleEditRole = (role: UserRole, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingRole === role) {
      setEditingRole(null);
    } else {
      setExpandedRole(role);
      setEditingRole(role);
      const roleData = roles.find(r => r.role === role);
      if (roleData) {
        setRolePermissions([...roleData.permissions]);
      }
    }
  };

  // Toggle a permission for the role being edited
  const handleTogglePermission = async (permissionCode: string) => {
    if (editingRole === null) return;

    try {
      setSavingPermission(permissionCode);
      const hasPermission = rolePermissions.includes(permissionCode);

      if (hasPermission) {
        await permissionService.revokeRolePermission(editingRole, permissionCode);
        const updated = rolePermissions.filter(p => p !== permissionCode);
        setRolePermissions(updated);
        // Update the roles state
        setRoles(prev => prev.map(r =>
          r.role === editingRole
            ? { ...r, permissions: updated, permissionCount: updated.length }
            : r
        ));
      } else {
        await permissionService.grantRolePermission(editingRole, permissionCode, true);
        const updated = [...rolePermissions, permissionCode];
        setRolePermissions(updated);
        setRoles(prev => prev.map(r =>
          r.role === editingRole
            ? { ...r, permissions: updated, permissionCount: updated.length }
            : r
        ));
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
    } finally {
      setSavingPermission(null);
    }
  };

  // Filter permissions for expanded view
  const filteredPermissions = allPermissions.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(allPermissions.map(p => p.category)))];

  // Group permissions by category for the expanded view
  const permissionsByCategory = filteredPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            Gestión de Roles
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Administra los roles del sistema y sus permisos asociados
          </p>
        </div>
      </div>

      {/* Roles Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total de Roles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{roles.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Permisos Disponibles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{allPermissions.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Categorías</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length - 1}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Roles List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Roles del Sistema</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Haz clic en un rol para ver sus permisos, o en el ícono de editar para modificarlos
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {roles.map((roleInfo) => {
            const Icon = roleInfo.icon;
            const isExpanded = expandedRole === roleInfo.role;
            const isEditing = editingRole === roleInfo.role;
            const permissionPercentage = roleInfo.totalPermissions > 0
              ? Math.round((roleInfo.permissionCount / roleInfo.totalPermissions) * 100)
              : 0;

            return (
              <div key={roleInfo.role}>
                {/* Role Row */}
                <div
                  onClick={() => handleExpandRole(roleInfo.role)}
                  className={`px-6 py-4 flex items-center justify-between cursor-pointer transition-colors ${
                    isExpanded
                      ? 'bg-gray-50 dark:bg-gray-700/50'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${roleInfo.bgColor}`}>
                      <Icon className={`w-6 h-6 ${roleInfo.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {roleInfo.name}
                      </h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {roleInfo.permissionCount} de {roleInfo.totalPermissions} permisos
                        </span>
                        {/* Progress bar */}
                        <div className="flex-1 max-w-[200px]">
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                permissionPercentage > 75
                                  ? 'bg-green-500'
                                  : permissionPercentage > 40
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${permissionPercentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right">
                          {permissionPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleEditRole(roleInfo.role, e)}
                      className={`p-2 rounded-lg transition-colors ${
                        isEditing
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={isEditing ? 'Cancelar edición' : 'Editar permisos'}
                    >
                      {isEditing ? <Edit2 className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Permissions View */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700">
                    {/* Search and Filter */}
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Buscar permisos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat === 'all' ? 'Todas las categorías' : cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isEditing && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                          <Edit2 className="w-4 h-4" />
                          Modo edición — Haz clic en los permisos para activarlos o desactivarlos para el rol <strong>{roleInfo.name}</strong>
                        </p>
                      </div>
                    )}

                    {/* Permissions grouped by category */}
                    {Object.entries(permissionsByCategory).map(([category, perms]) => (
                      <div key={category} className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {perms.map(permission => {
                            const hasPermission = rolePermissions.includes(permission.code);
                            const isSaving = savingPermission === permission.code;

                            return (
                              <div
                                key={permission.id}
                                onClick={() => isEditing && !isSaving && handleTogglePermission(permission.code)}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                  isEditing ? 'cursor-pointer' : 'cursor-default'
                                } ${
                                  hasPermission
                                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                                    : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800'
                                } ${isEditing && !isSaving ? 'hover:shadow-md' : ''}`}
                              >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                  hasPermission
                                    ? 'bg-green-100 dark:bg-green-900/40'
                                    : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                  {isSaving ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                                  ) : hasPermission ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <X className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium truncate ${
                                    hasPermission
                                      ? 'text-green-800 dark:text-green-300'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {permission.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 truncate font-mono">
                                    {permission.code}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {filteredPermissions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No se encontraron permisos con ese criterio de búsqueda
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
