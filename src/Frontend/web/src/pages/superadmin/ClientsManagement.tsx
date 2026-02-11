import { useState, useEffect } from 'react';
import { 
  Building2, Search, Edit, Trash2, 
  Eye, Users, Home, X, Save,
  CheckCircle, AlertCircle, RefreshCw, Power,
  MapPin, Mail, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import { clientManagementService, type ClientListItem, type ClientDetail } from '../../lib/clientManagementService';

export default function ClientsManagement() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClient, setEditClient] = useState<ClientListItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'México'
  });
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteClient, setDeleteClient] = useState<ClientListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await clientManagementService.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
      setFeedback({ type: 'error', message: 'Error al cargar los clientes' });
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients
    .filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (client.adminEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' ? client.isActive : !client.isActive);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Sort by admin email: those with admin first, then alphabetically
      const aAdmin = a.adminEmail || '';
      const bAdmin = b.adminEmail || '';
      if (aAdmin && !bAdmin) return -1;
      if (!aAdmin && bAdmin) return 1;
      return aAdmin.localeCompare(bAdmin);
    });

  // === VIEW DETAIL ===
  const handleViewDetail = async (client: ClientListItem) => {
    setSelectedClient(null);
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const detail = await clientManagementService.getClientDetail(client.id);
      if (detail) {
        setSelectedClient(detail);
      } else {
        setFeedback({ type: 'error', message: 'No se encontraron detalles del condominio' });
        setShowDetailModal(false);
      }
    } catch (error: any) {
      console.error('Error loading detail:', error);
      setFeedback({ type: 'error', message: error?.message || 'Error al cargar los detalles del condominio' });
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // === EDIT ===
  const handleOpenEdit = (client: ClientListItem) => {
    setEditClient(client);
    const addressParts = client.address.split(', ');
    setEditForm({
      name: client.name,
      description: client.description || '',
      street: addressParts[0] || '',
      city: addressParts[1] || '',
      state: addressParts[2] || '',
      postalCode: '',
      country: 'México'
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editClient) return;
    setEditLoading(true);
    try {
      await clientManagementService.updateClient(editClient.id, {
        name: editForm.name,
        description: editForm.description || undefined,
        street: editForm.street,
        city: editForm.city,
        state: editForm.state,
        postalCode: editForm.postalCode || '00000',
        country: editForm.country || 'México'
      });
      setFeedback({ type: 'success', message: `"${editForm.name}" actualizado correctamente` });
      setShowEditModal(false);
      setEditClient(null);
      await loadData();
    } catch (error: any) {
      console.error('Error updating client:', error);
      const msg = error?.response?.data?.message || error?.message || 'Error al actualizar el condominio';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setEditLoading(false);
    }
  };

  // === TOGGLE STATUS ===
  const handleToggleStatus = async (client: ClientListItem) => {
    try {
      if (client.isActive) {
        await clientManagementService.deactivateClient(client.id);
        setFeedback({ type: 'success', message: `"${client.name}" suspendido correctamente` });
      } else {
        await clientManagementService.activateClient(client.id);
        setFeedback({ type: 'success', message: `"${client.name}" activado correctamente` });
      }
      await loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
      setFeedback({ type: 'error', message: 'Error al cambiar el estado del condominio' });
    }
  };

  // === DELETE ===
  const handleOpenDelete = (client: ClientListItem) => {
    setDeleteClient(client);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteClient) return;
    setDeleteLoading(true);
    try {
      await clientManagementService.deleteClient(deleteClient.id);
      setFeedback({ type: 'success', message: `"${deleteClient.name}" eliminado correctamente` });
      setShowDeleteModal(false);
      setDeleteClient(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting client:', error);
      setFeedback({ type: 'error', message: 'Error al eliminar el condominio' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? { style: 'bg-green-500/20 text-green-400', label: 'Activo' }
      : { style: 'bg-red-500/20 text-red-400', label: 'Suspendido' };
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border transition-all ${
          feedback.type === 'success' 
            ? 'bg-green-900/80 border-green-500/50 text-green-300' 
            : 'bg-red-900/80 border-red-500/50 text-red-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-2 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-400" />
            Gestión de Clientes
          </h1>
          <p className="text-gray-400 mt-2">
            Administra todos los condominios de la plataforma
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{clients.length}</p>
              <p className="text-sm text-gray-400">Total Clientes</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center gap-3">
            <Home className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{clients.reduce((acc, c) => acc + c.totalUnits, 0)}</p>
              <p className="text-sm text-gray-400">Total Unidades</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{clients.reduce((acc, c) => acc + c.totalUsers, 0)}</p>
              <p className="text-sm text-gray-400">Total Usuarios</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">{clients.filter(c => c.isActive).length}</p>
              <p className="text-sm text-gray-400">Clientes Activos</p>
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
            placeholder="Buscar por nombre, email de admin o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Suspendido</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="ml-3 text-gray-400">Cargando clientes...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Building2 className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg">No se encontraron clientes</p>
            <p className="text-sm">Intenta con otros criterios de búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm bg-gray-800/50">
                  <th className="px-6 py-4 font-medium">Condominio</th>
                  <th className="px-6 py-4 font-medium">Administrador</th>
                  <th className="px-6 py-4 font-medium">Edificios</th>
                  <th className="px-6 py-4 font-medium">Unidades</th>
                  <th className="px-6 py-4 font-medium">Usuarios</th>
                  <th className="px-6 py-4 font-medium">Fecha Registro</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {filteredClients.map((client) => {
                  const statusBadge = getStatusBadge(client.isActive);
                  return (
                    <tr key={client.id} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{client.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-gray-500" />
                            <p className="text-sm text-gray-500">{client.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {client.adminEmail ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-blue-400" />
                              <p className="text-sm text-white font-medium">{client.adminEmail}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-blue-400 font-medium">{client.totalBuildings}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-medium">{client.totalUnits}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-purple-400 font-medium">{client.totalUsers}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="text-sm">{formatDate(client.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.style}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewDetail(client)}
                            className="p-2 hover:bg-gray-700 rounded-lg text-blue-400 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="p-2 hover:bg-gray-700 rounded-lg text-yellow-400 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(client)}
                            className={`p-2 hover:bg-gray-700 rounded-lg transition-colors ${
                              client.isActive ? 'text-orange-400' : 'text-green-400'
                            }`}
                            title={client.isActive ? 'Suspender' : 'Activar'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(client)}
                            className="p-2 hover:bg-gray-700 rounded-lg text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== DETAIL MODAL ===== */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-400" />
                Detalle del Condominio
              </h2>
              <button onClick={() => { setShowDetailModal(false); setSelectedClient(null); }} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                  <span className="ml-3 text-gray-400">Cargando detalles...</span>
                </div>
              ) : selectedClient ? (
                <div className="space-y-6">
                  {/* Info general */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Nombre</label>
                      <p className="text-white font-medium">{selectedClient.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Estado</label>
                      <p>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedClient.isActive).style}`}>
                          {getStatusBadge(selectedClient.isActive).label}
                        </span>
                      </p>
                    </div>
                    {selectedClient.description && (
                      <div className="col-span-2">
                        <label className="text-sm text-gray-400">Descripción</label>
                        <p className="text-gray-300">{selectedClient.description}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className="text-sm text-gray-400">Dirección</label>
                      <p className="text-gray-300">
                        {selectedClient.address.street}, {selectedClient.address.city}, {selectedClient.address.state} {selectedClient.address.postalCode}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Edificios</label>
                      <p className="text-2xl font-bold text-blue-400">{selectedClient.totalBuildings}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Unidades</label>
                      <p className="text-2xl font-bold text-green-400">{selectedClient.totalUnits}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Fecha de Registro</label>
                      <p className="text-gray-300">{formatDate(selectedClient.createdAt)}</p>
                    </div>
                  </div>

                  {/* Buildings */}
                  {selectedClient.buildings && selectedClient.buildings.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Home className="w-5 h-5 text-blue-400" />
                        Edificios ({selectedClient.buildings.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedClient.buildings.map((building) => (
                          <BuildingAccordion key={building.id} building={building} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No se encontraron detalles</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {showEditModal && editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-6 h-6 text-yellow-400" />
                Editar Condominio
              </h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Descripción</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Calle *</label>
                <input
                  type="text"
                  value={editForm.street}
                  onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ciudad *</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Estado *</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Código Postal</label>
                  <input
                    type="text"
                    value={editForm.postalCode}
                    onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">País</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={editLoading || !editForm.name || !editForm.street || !editForm.city || !editForm.state}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {showDeleteModal && deleteClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-xl border border-red-700/50 shadow-2xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Eliminar Condominio</h2>
                  <p className="text-sm text-gray-400">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 mb-6">
                <p className="text-gray-300">
                  ¿Estás seguro de que deseas eliminar <span className="font-bold text-white">"{deleteClient.name}"</span>?
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Se desactivará el condominio con {deleteClient.totalBuildings} edificio(s), {deleteClient.totalUnits} unidad(es) y {deleteClient.totalUsers} usuario(s).
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteClient(null); }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleteLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Building Accordion Component ===
function BuildingAccordion({ building }: { building: { id: string; name: string; description?: string; totalFloors: number; totalUnits: number; units: Array<{ id: string; unitNumber: string; floor: number; area?: number; bedrooms?: number; bathrooms?: number; hasOwner: boolean; totalResidents: number }> } }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-700/50 rounded-lg border border-gray-600/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-700/70 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-blue-400" />
          <div>
            <p className="font-medium text-white">{building.name}</p>
            <p className="text-sm text-gray-400">{building.totalFloors} pisos · {building.totalUnits} unidades</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isOpen && building.units.length > 0 && (
        <div className="border-t border-gray-600/50 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {building.units.map((unit) => (
              <div
                key={unit.id}
                className={`p-3 rounded-lg border text-sm ${
                  unit.hasOwner 
                    ? 'bg-green-900/20 border-green-700/30' 
                    : 'bg-gray-600/30 border-gray-600/30'
                }`}
              >
                <p className="font-medium text-white">{unit.unitNumber}</p>
                <p className="text-gray-400 text-xs">Piso {unit.floor}</p>
                {unit.area && <p className="text-gray-400 text-xs">{unit.area} m²</p>}
                <p className="text-xs mt-1">
                  {unit.hasOwner ? (
                    <span className="text-green-400">● Asignada</span>
                  ) : (
                    <span className="text-gray-500">○ Disponible</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
