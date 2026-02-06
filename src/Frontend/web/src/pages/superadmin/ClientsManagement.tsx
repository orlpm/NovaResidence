import { useState } from 'react';
import { 
  Building2, Plus, Search, Filter, Edit, Trash2, 
  Eye, MoreVertical, Users, Home, DollarSign
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  plan: 'basic' | 'standard' | 'premium';
  units: number;
  users: number;
  monthlyRevenue: number;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  adminEmail: string;
}

export default function ClientsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const clients: Client[] = [
    { id: '1', name: 'Residencial Las Palmas', plan: 'premium', units: 120, users: 245, monthlyRevenue: 2500, status: 'active', createdAt: '2024-01-15', adminEmail: 'admin@laspalmas.com' },
    { id: '2', name: 'Torres del Sol', plan: 'basic', units: 48, users: 92, monthlyRevenue: 800, status: 'active', createdAt: '2024-01-10', adminEmail: 'admin@torresdelsol.com' },
    { id: '3', name: 'Condominios Vista Mar', plan: 'premium', units: 200, users: 380, monthlyRevenue: 3500, status: 'active', createdAt: '2024-01-05', adminEmail: 'admin@vistamar.com' },
    { id: '4', name: 'Jardines del Norte', plan: 'standard', units: 75, users: 150, monthlyRevenue: 1200, status: 'pending', createdAt: '2024-01-02', adminEmail: 'admin@jardinesnorte.com' },
    { id: '5', name: 'Plaza Central', plan: 'basic', units: 30, users: 55, monthlyRevenue: 600, status: 'suspended', createdAt: '2023-12-20', adminEmail: 'admin@plazacentral.com' },
  ];

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.adminEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = filterPlan === 'all' || client.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getPlanBadge = (plan: string) => {
    const styles = {
      premium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      standard: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      basic: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return styles[plan as keyof typeof styles] || styles.basic;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-500/20 text-green-400',
      suspended: 'bg-red-500/20 text-red-400',
      pending: 'bg-orange-500/20 text-orange-400'
    };
    const labels = { active: 'Activo', suspended: 'Suspendido', pending: 'Pendiente' };
    return { style: styles[status as keyof typeof styles], label: labels[status as keyof typeof labels] };
  };

  return (
    <div className="space-y-6">
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
          onClick={() => setShowNewClientModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
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
              <p className="text-2xl font-bold text-white">{clients.reduce((acc, c) => acc + c.units, 0)}</p>
              <p className="text-sm text-gray-400">Total Unidades</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{clients.reduce((acc, c) => acc + c.users, 0)}</p>
              <p className="text-sm text-gray-400">Total Usuarios</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">${clients.reduce((acc, c) => acc + c.monthlyRevenue, 0).toLocaleString()}</p>
              <p className="text-sm text-gray-400">Ingresos Mensuales</p>
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
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos los planes</option>
          <option value="premium">Premium</option>
          <option value="standard">Estándar</option>
          <option value="basic">Básico</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="pending">Pendiente</option>
          <option value="suspended">Suspendido</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm bg-gray-800/50">
                <th className="px-6 py-4 font-medium">Condominio</th>
                <th className="px-6 py-4 font-medium">Plan</th>
                <th className="px-6 py-4 font-medium">Unidades</th>
                <th className="px-6 py-4 font-medium">Usuarios</th>
                <th className="px-6 py-4 font-medium">Ingresos/mes</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {filteredClients.map((client) => {
                const statusBadge = getStatusBadge(client.status);
                return (
                  <tr key={client.id} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.adminEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPlanBadge(client.plan)}`}>
                        {client.plan.charAt(0).toUpperCase() + client.plan.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">{client.units}</td>
                    <td className="px-6 py-4">{client.users}</td>
                    <td className="px-6 py-4 text-green-400">${client.monthlyRevenue.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.style}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-700 rounded-lg text-blue-400 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-gray-700 rounded-lg text-yellow-400 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-gray-700 rounded-lg text-red-400 transition-colors">
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
      </div>
    </div>
  );
}
