import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { incidentService, IncidentStatus, IncidentPriority } from '../../lib/incidentService';
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, PlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Incident {
  id: string;
  title: string;
  type: number;
  typeName: string;
  priority: IncidentPriority;
  priorityName: string;
  status: IncidentStatus;
  statusName: string;
  unitNumber: string | null;
  reportedByName: string;
  assignedToName: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

function MyIncidents() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | null>(null);

  useEffect(() => {
    loadIncidents();
  }, [user?.id]);

  const loadIncidents = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const incidents = await incidentService.getMyIncidents(user.id);
      setIncidents(incidents as unknown as Incident[]);
    } catch (error: any) {
      console.warn('Error loading incidents:', error);
      // Solo mostrar error si no es un problema de "no hay datos"
      if (error.response?.status !== 404) {
        toast.error('Error al cargar incidencias');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = selectedStatus !== null
    ? incidents.filter(i => i.status === selectedStatus)
    : incidents;

  const openIncidents = incidents.filter(i => 
    i.status !== IncidentStatus.Closed && i.status !== IncidentStatus.Resolved
  );

  const getStatusIcon = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.Closed:
      case IncidentStatus.Resolved:
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case IncidentStatus.Open:
      case IncidentStatus.Reopened:
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: IncidentStatus) => {
    switch (status) {
      case IncidentStatus.Closed:
      case IncidentStatus.Resolved:
        return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      case IncidentStatus.Open:
      case IncidentStatus.Reopened:
        return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
      case IncidentStatus.InProgress:
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    }
  };

  const getPriorityColor = (priority: IncidentPriority) => {
    switch (priority) {
      case IncidentPriority.Urgent:
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case IncidentPriority.High:
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case IncidentPriority.Medium:
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case IncidentPriority.Low:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Mis Incidencias</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Reporta y sigue tus solicitudes de mantenimiento</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Total Incidencias</h3>
            <ExclamationTriangleIcon className="h-6 w-6 text-sky-500" />
          </div>
          <p className="text-4xl font-black text-sky-600 dark:text-sky-400">{incidents.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Todas tus reportes</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Abiertas</h3>
            <ClockIcon className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-4xl font-black text-yellow-600 dark:text-yellow-400">{openIncidents.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Requieren atención</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Resueltas</h3>
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-4xl font-black text-green-600 dark:text-green-400">
            {incidents.filter(i => i.status === IncidentStatus.Resolved || i.status === IncidentStatus.Closed).length}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Incidencias cerradas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedStatus(null)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === null
              ? 'bg-sky-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setSelectedStatus(IncidentStatus.Open)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === IncidentStatus.Open
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Abiertas
        </button>
        <button
          onClick={() => setSelectedStatus(IncidentStatus.InProgress)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === IncidentStatus.InProgress
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          En Progreso
        </button>
        <button
          onClick={() => setSelectedStatus(IncidentStatus.Resolved)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === IncidentStatus.Resolved
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Resueltas
        </button>
      </div>

      {/* New Incident Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/resident/incidents/new')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <PlusIcon className="w-5 h-5" />
          Reportar Nueva Incidencia
        </button>
      </div>

      {/* Incidents List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando incidencias...</p>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
          <ExclamationTriangleIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">No hay incidencias en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map(incident => (
            <div
              key={incident.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
              onClick={() => navigate(`/resident/incidents/${incident.id}`)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(incident.status)}
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{incident.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{incident.typeName}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(incident.status)}`}>
                      {incident.statusName}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(incident.priority)}`}>
                      {incident.priorityName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Creada: {new Date(incident.createdAt).toLocaleDateString('es-ES')}</span>
                  {incident.assignedToName && (
                    <span className="font-semibold">Asignado a: {incident.assignedToName}</span>
                  )}
                  <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                    Ver detalles
                    <ArrowRightIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyIncidents;
