import { useState, useEffect } from 'react';
import { Shield, Search, Filter, Check, X, Clock, AlertCircle } from 'lucide-react';
import { permissionService, Permission } from '../../lib/permissionService';
import { useAuthStore } from '../../stores/authStore';
import { ROLE_CONFIG, UserRole } from '../../config/roles';

interface UserPermissionGrant {
  userId: string;
  userName: string;
  permissionCode: string;
  permissionName: string;
  condominiumId?: string;
  expiresAt?: string;
  reason?: string;
}

export default function PermissionManagement() {
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'custom'>('roles');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.Owner);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  // Fetch all permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const data = await permissionService.getAllPermissions();
        setPermissions(data);
      } catch (error) {
        console.error('Error loading permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  // Fetch role permissions when role changes
  useEffect(() => {
    const fetchRolePermissions = async () => {
      try {
        const data = await permissionService.getRolePermissions(selectedRole);
        setRolePermissions(data);
      } catch (error) {
        console.error('Error loading role permissions:', error);
      }
    };

    if (activeTab === 'roles') {
      fetchRolePermissions();
    }
  }, [selectedRole, activeTab]);

  // Filter permissions
  const filteredPermissions = permissions.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(permissions.map(p => p.category)))];

  const handleToggleRolePermission = async (permissionCode: string) => {
    try {
      const hasPermission = rolePermissions.includes(permissionCode);
      
      if (hasPermission) {
        // For revoke, we would need backend support
        console.log('Revoke not implemented yet');
      } else {
        await permissionService.grantRolePermission(selectedRole, permissionCode, true);
        setRolePermissions([...rolePermissions, permissionCode]);
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Gestión de Permisos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Administra permisos para roles y usuarios individuales
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'roles'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Permisos por Rol
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Permisos de Usuarios
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'custom'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Personalizaciones
          </button>
        </nav>
      </div>

      {/* Role Permissions Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Role Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Seleccionar Rol
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => {
                const role = parseInt(roleKey) as UserRole;
                const Icon = config.icon;
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      selectedRole === role
                        ? `${config.bgColor} border-current ${config.color}`
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${selectedRole === role ? config.color : 'text-gray-400'}`} />
                    <span className={`font-medium ${selectedRole === role ? config.color : 'text-gray-700 dark:text-gray-300'}`}>
                      {config.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar permisos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas las categorías' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Permissions List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Cargando permisos...</div>
              ) : filteredPermissions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No se encontraron permisos</div>
              ) : (
                filteredPermissions.map(permission => {
                  const hasPermission = rolePermissions.includes(permission.code);
                  return (
                    <div
                      key={permission.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {permission.name}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {permission.category}
                          </span>
                          {permission.isSystem && (
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                              Sistema
                            </span>
                          )}
                        </div>
                        {permission.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {permission.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                          {permission.code}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleRolePermission(permission.code)}
                        className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                          hasPermission
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {hasPermission ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <X className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Gestión de Permisos de Usuarios
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Esta funcionalidad permite asignar permisos temporales o permanentes a usuarios específicos.
            </p>
          </div>
        </div>
      )}

      {/* Custom Tab */}
      {activeTab === 'custom' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Personalizaciones de Condominio
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Personaliza permisos específicos por condominio, anulando las configuraciones globales de roles.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
