import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { residentService } from '../../lib/residentService';
import { 
  incidentService, 
  IncidentType, 
  IncidentPriority,
  incidentTypeNames,
  incidentPriorityNames 
} from '../../lib/incidentService';
import { 
  ArrowLeftIcon, 
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  ShieldExclamationIcon,
  BoltIcon,
  SparklesIcon,
  NoSymbolIcon,
  QuestionMarkCircleIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ResidentInfo {
  id: string;
  unitId: string;
  unitNumber: string;
  buildingName: string;
  condominiumId?: string;
}

function NewIncident() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [residentInfo, setResidentInfo] = useState<ResidentInfo | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: IncidentType.Maintenance,
    priority: IncidentPriority.Medium,
    location: ''
  });

  useEffect(() => {
    loadResidentInfo();
  }, [user?.id]);

  const loadResidentInfo = async () => {
    if (!user?.id) return;
    try {
      const resident = await residentService.getResidentInfo(user.id);
      if (resident) {
        const info: ResidentInfo = {
          id: resident.id,
          unitId: resident.unitId,
          unitNumber: resident.unitNumber,
          buildingName: resident.buildingName,
          condominiumId: resident.condominiumId
        };
        setResidentInfo(info);
      }
    } catch (error) {
      console.error('Error loading resident info:', error);
      toast.error('Error al cargar información del residente');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!residentInfo || !user?.id) {
      toast.error('No se encontró información del residente');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Por favor ingresa un título para la incidencia');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Por favor describe el problema');
      return;
    }

    setSubmitting(true);
    try {
      await incidentService.create({
        condominiumId: residentInfo.condominiumId || '',
        reportedById: user.id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        location: formData.location || `Unidad ${residentInfo.unitNumber} - ${residentInfo.buildingName}`,
        unitId: residentInfo.unitId
      });

      toast.success('Incidencia reportada exitosamente');
      navigate('/resident/incidents');
    } catch (error: any) {
      console.error('Error creating incident:', error);
      toast.error(error.response?.data?.message || 'Error al reportar la incidencia');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type: IncidentType) => {
    switch (type) {
      case IncidentType.Maintenance:
        return <WrenchScrewdriverIcon className="w-6 h-6" />;
      case IncidentType.Security:
        return <ShieldExclamationIcon className="w-6 h-6" />;
      case IncidentType.Noise:
        return <BoltIcon className="w-6 h-6" />;
      case IncidentType.Plumbing:
        return <SparklesIcon className="w-6 h-6" />;
      case IncidentType.Parking:
        return <NoSymbolIcon className="w-6 h-6" />;
      default:
        return <QuestionMarkCircleIcon className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        </div>
      </div>
    );
  }

  if (!residentInfo) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
          <p className="text-yellow-800 dark:text-yellow-200">No se encontró información del residente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/resident/incidents')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Volver a Incidencias</span>
        </button>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Reportar Nueva Incidencia</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Unidad {residentInfo.unitNumber} - {residentInfo.buildingName}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Título */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Título del Reporte *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ej: Fuga de agua en baño principal"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            required
          />
        </div>

        {/* Tipo de Incidencia */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Tipo de Incidencia *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(incidentTypeNames).map(([key, name]) => {
              const typeKey = parseInt(key) as IncidentType;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: typeKey })}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    formData.type === typeKey
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {getTypeIcon(typeKey)}
                  <span className="font-medium text-sm">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prioridad */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Prioridad *
          </label>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(incidentPriorityNames).map(([key, name]) => {
              const priorityKey = parseInt(key) as IncidentPriority;
              const colors: Record<number, string> = {
                [IncidentPriority.Low]: 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
                [IncidentPriority.Medium]: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
                [IncidentPriority.High]: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
                [IncidentPriority.Urgent]: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              };
              const inactiveColors: Record<number, string> = {
                [IncidentPriority.Low]: 'hover:border-green-300',
                [IncidentPriority.Medium]: 'hover:border-yellow-300',
                [IncidentPriority.High]: 'hover:border-orange-300',
                [IncidentPriority.Urgent]: 'hover:border-red-300'
              };
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: priorityKey })}
                  className={`px-6 py-3 rounded-xl border-2 font-semibold transition-all ${
                    formData.priority === priorityKey
                      ? colors[priorityKey] || 'border-gray-500'
                      : `border-gray-200 dark:border-gray-600 ${inactiveColors[priorityKey] || ''} text-gray-700 dark:text-gray-300`
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Descripción del Problema *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe el problema con el mayor detalle posible. Incluye desde cuándo ocurre, qué tan frecuente es, y cualquier otro dato relevante."
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all resize-none"
            required
          />
        </div>

        {/* Ubicación Específica */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <MapPinIcon className="w-5 h-5" />
              Ubicación Específica (Opcional)
            </div>
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder={`Ej: Baño principal, Área de estacionamiento, etc. (Por defecto: Unidad ${residentInfo.unitNumber})`}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Botones */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => navigate('/resident/incidents')}
            className="px-6 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Enviando...
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="w-5 h-5" />
                Reportar Incidencia
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewIncident;
