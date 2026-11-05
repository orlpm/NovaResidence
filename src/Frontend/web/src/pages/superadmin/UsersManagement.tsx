import { useState, useEffect } from 'react';
import { 
  Users, Search, Edit, Trash2, Eye, 
  Building2, UserCheck, UserX, 
  Crown, Home,
  Mail, Key, X, RefreshCw,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { userManagementService, UserListItem } from '../../lib/userManagementService';
import { ActionMenu } from '../../components/ActionMenu';

const ROLE_ICONS: Record<string, React.ElementType> = {
  'SuperAdmin': Crown,
  'Admin': Building2,
  'Resident': Home,
  'User': Users
};

const ROLE_COLORS: Record<string, string> = {
  'SuperAdmin': 'text-purple-400 bg-purple-500/20 border-purple-500/30',
  'Admin': 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  'Resident': 'text-green-400 bg-green-500/20 border-green-500/30',
  'User': 'text-gray-400 bg-gray-500/20 border-gray-500/30'
};

export default function UsersManagement() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);
  
  // Reset password modal state
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const usersData = await userManagementService.getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.defaultRole === filterRole;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' ? user.isActive : !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleUserStatus = async (user: UserListItem) => {
    if (user.isActive) {
      await userManagementService.deactivateUser(user.id);
    } else {
      await userManagementService.activateUser(user.id);
    }
    await loadData();
    setShowUserMenu(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      await userManagementService.deleteUser(userId);
      await loadData();
    }
    setShowUserMenu(null);
  };

  const openResetPasswordModal = (user: UserListItem) => {
    setResetPasswordUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetPasswordError('');
    setResetPasswordSuccess('');
    setShowResetPasswordModal(true);
    setShowUserMenu(null);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;

    if (newPassword.length < 6) {
      setResetPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetPasswordError('Las contraseñas no coinciden');
      return;
    }

    setResetPasswordLoading(true);
    setResetPasswordError('');
    setResetPasswordSuccess('');

    try {
      const result = await userManagementService.resetPassword(resetPasswordUser.id, newPassword);
      setResetPasswordSuccess(`Contraseña actualizada para ${result.email}`);
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setShowResetPasswordModal(false);
        setResetPasswordUser(null);
        setResetPasswordSuccess('');
      }, 2000);
    } catch (error: any) {
      setResetPasswordError(error.response?.data?.message || 'Error al resetear contraseña');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const superAdmins = users.filter(u => u.defaultRole === 'SuperAdmin').length;
  const admins = users.filter(u => u.defaultRole === 'Admin').length;

  const getRoleColor = (role: string): string => {
    return ROLE_COLORS[role] || ROLE_COLORS.User;
  };

  const getRoleIcon = (role: string): React.ElementType => {
    return ROLE_ICONS[role] || Users;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-400" />
            Gestión de Usuarios
          </h1>
          <p className="text-gray-400 mt-2">
            Administra todos los usuarios de la plataforma
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl p-5 border border-purple-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalUsers}</p>
              <p className="text-sm text-gray-400">Total Usuarios</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-5 border border-green-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <UserCheck className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeUsers}</p>
              <p className="text-sm text-gray-400">Activos</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-xl p-5 border border-yellow-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/20">
              <Crown className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{superAdmins}</p>
              <p className="text-sm text-gray-400">Super Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-5 border border-blue-500/20">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{admins}</p>
              <p className="text-sm text-gray-400">Administradores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos los roles</option>
          <option value="SuperAdmin">Super Admin</option>
          <option value="Admin">Administrador</option>
          <option value="Resident">Residente</option>
          <option value="User">Usuario</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm bg-gray-800/50">
                  <th className="px-6 py-4 font-medium">Usuario</th>
                  <th className="px-6 py-4 font-medium">Rol</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium">Email Verificado</th>
                  <th className="px-6 py-4 font-medium">Último Login</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {filteredUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.defaultRole);
                  
                  return (
                    <tr key={user.id} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                            {user.firstName?.[0] || 'U'}{user.lastName?.[0] || ''}
                          </div>
                          <div>
                            <p className="font-medium text-white">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.defaultRole)}`}>
                          <RoleIcon className="w-3 h-3" />
                          {user.defaultRole || 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
                            <UserX className="w-3 h-3" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.isEmailConfirmed ? (
                          <span className="text-green-400">✓ Verificado</span>
                        ) : (
                          <span className="text-yellow-400">Pendiente</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {user.lastLoginAt 
                          ? new Date(user.lastLoginAt).toLocaleDateString('es-MX')
                          : 'Nunca'
                        }
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 relative">
                          <button 
                            className="p-2 hover:bg-gray-700 rounded-lg text-blue-400 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 hover:bg-gray-700 rounded-lg text-yellow-400 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <ActionMenu
                            open={showUserMenu === user.id}
                            onOpenChange={(next) => setShowUserMenu(next ? user.id : null)}
                            buttonClassName="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
                            iconClassName="w-4 h-4"
                            menuClassName="w-52 rounded-lg border border-gray-700 bg-gray-800 shadow-xl"
                          >
                                <button 
                                  onClick={() => handleToggleUserStatus(user)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-gray-300"
                                >
                                  {user.isActive ? (
                                    <>
                                      <UserX className="w-4 h-4 text-orange-400" />
                                      Desactivar usuario
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-4 h-4 text-green-400" />
                                      Activar usuario
                                    </>
                                  )}
                                </button>
                                <button 
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-gray-300"
                                >
                                  <Mail className="w-4 h-4" />
                                  Reenviar verificación
                                </button>
                                <button 
                                  onClick={() => openResetPasswordModal(user)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-yellow-400"
                                >
                                  <Key className="w-4 h-4" />
                                  Resetear contraseña
                                </button>
                                <hr className="border-gray-700 my-1" />
                                <button 
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Eliminar usuario
                                </button>
                          </ActionMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No se encontraron usuarios</h3>
            <p className="text-gray-500">Intenta cambiar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowUserMenu(null)}
        />
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Key className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Resetear Contraseña</h3>
                  <p className="text-sm text-gray-400">{resetPasswordUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                  {resetPasswordUser.firstName?.[0] || 'U'}{resetPasswordUser.lastName?.[0] || ''}
                </div>
                <div>
                  <p className="text-white font-medium">{resetPasswordUser.firstName} {resetPasswordUser.lastName}</p>
                  <p className="text-sm text-gray-400">{resetPasswordUser.defaultRole || 'User'}</p>
                </div>
              </div>

              {resetPasswordError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{resetPasswordError}</span>
                </div>
              )}

              {resetPasswordSuccess && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{resetPasswordSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nueva Contraseña</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirmar Contraseña</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetPasswordLoading || !newPassword || !confirmPassword}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetPasswordLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Resetear Contraseña
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
