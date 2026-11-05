import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { condominiumService, type UserCondominiumDto } from '../../lib/condominiumService';
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
  PhotoIcon,
  WrenchScrewdriverIcon,
  ShieldExclamationIcon,
  BoltIcon,
  SparklesIcon,
  NoSymbolIcon,
  QuestionMarkCircleIcon,
  MapPinIcon,
  HomeModernIcon,
  BugAntIcon,
  CubeIcon,
  LightBulbIcon
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
  const route = useLocation();
  const { user } = useAuthStore();
  const incidentsPath = route.pathname.startsWith('/maintenance')
    ? '/maintenance/incidents'
    : route.pathname.startsWith('/cleaning')
      ? '/cleaning/incidents'
      : '/resident/incidents';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [residentInfo, setResidentInfo] = useState<ResidentInfo | null>(null);
  const [condominiums, setCondominiums] = useState<UserCondominiumDto[]>([]);
  const [selectedCondominiumId, setSelectedCondominiumId] = useState('');
  
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

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const loadResidentInfo = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const resident = await residentService.getResidentInfo(user.id);
      if (resident?.condominiumId) {
        setResidentInfo({
          id: resident.id,
          unitId: resident.unitId,
          unitNumber: resident.unitNumber,
          buildingName: resident.buildingName,
          condominiumId: resident.condominiumId
        });
        return;
      }

      const assigned = await condominiumService.getAllCondominiums(user.id);
      setCondominiums(assigned);
      if (assigned[0]) {
        setSelectedCondominiumId(assigned[0].id);
      }
      if (route.pathname.startsWith('/cleaning')) {
        setFormData(current => ({ ...current, type: IncidentType.CommonArea }));
      }
    } catch (error) {
      console.error('Error loading incident context:', error);
      toast.error('No se pudo preparar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const condominiumId = residentInfo?.condominiumId || selectedCondominiumId;
    if (!user?.id || !condominiumId) {
      toast.error(residentInfo ? 'No se encontró información del residente' : 'Selecciona el condominio del reporte');
      return;
    }

    if (!residentInfo && !formData.location.trim()) {
      toast.error('Indica dónde se encuentra el problema');
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
      let uploadedPhotoUrl: string | null = null;
      if (selectedPhoto) {
        uploadedPhotoUrl = await incidentService.uploadPhoto(selectedPhoto);
      }

      await incidentService.create({
        condominiumId,
        reportedById: user.id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        location: formData.location || `Unidad ${residentInfo?.unitNumber} - ${residentInfo?.buildingName}`,
        unitId: residentInfo?.unitId,
        photoUrl: uploadedPhotoUrl
      });

      toast.success('Incidencia reportada exitosamente');
      navigate(incidentsPath);
    } catch (error: any) {
      console.error('Error creating incident:', error);
      const responseData = error?.response?.data;
      const validationErrors = responseData?.errors;
      const firstValidationMessage = validationErrors && typeof validationErrors === 'object'
        ? Object.values(validationErrors).flat().find((msg) => typeof msg === 'string')
        : null;
      const errorMessage =
        responseData?.message ||
        firstValidationMessage ||
        (Array.isArray(responseData?.errors) ? responseData.errors[0] : null) ||
        (typeof responseData === 'string' ? responseData : null) ||
        'Error al reportar la incidencia';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setSelectedPhoto(null);
      setPhotoPreviewUrl(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no válido. Usa JPG, PNG o WEBP');
      e.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('La imagen no debe superar 8MB');
      e.target.value = '';
      return;
    }

    setSelectedPhoto(file);
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setSelectedPhoto(null);
    setPhotoPreviewUrl(null);
  };

  const getTypeIcon = (type: IncidentType) => {
    switch (type) {
      case IncidentType.Maintenance:
        return <WrenchScrewdriverIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />;
      case IncidentType.Security:
        return <ShieldExclamationIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />;
      case IncidentType.Noise:
        return <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />;
      case IncidentType.Parking:
        return <NoSymbolIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />;
      case IncidentType.CommonArea:
        return <HomeModernIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />;
      case IncidentType.Plumbing:
        return <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />;
      case IncidentType.Electrical:
        return <LightBulbIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />;
      case IncidentType.Structural:
        return <CubeIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />;
      case IncidentType.Pest:
        return <BugAntIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />;
      case IncidentType.Other:
      default:
        return <QuestionMarkCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />;
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

  if (!residentInfo && condominiums.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-6">
          <p className="text-yellow-800 dark:text-yellow-200">No tienes un condominio asignado para reportar la incidencia.</p>
        </div>
      </div>
    );
  }

  const selectedCondominium = condominiums.find(item => item.id === selectedCondominiumId);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(incidentsPath)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Volver a Incidencias</span>
        </button>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Reportar Nueva Incidencia</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {residentInfo
            ? `Unidad ${residentInfo.unitNumber} - ${residentInfo.buildingName}`
            : selectedCondominium?.name || 'Reporta un problema del condominio'}
        </p>
        {!residentInfo && condominiums.length > 1 && (
          <label className="block mt-4">
            <span className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Condominio *</span>
            <select
              value={selectedCondominiumId}
              onChange={(event) => setSelectedCondominiumId(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {condominiums.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        )}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {Object.entries(incidentTypeNames).map(([key, name]) => {
              const typeKey = parseInt(key) as IncidentType;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: typeKey })}
                  className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    formData.type === typeKey
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {getTypeIcon(typeKey)}
                  <span className="font-medium text-xs sm:text-sm">{name}</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
                  className={`px-3 sm:px-6 py-3 rounded-xl border-2 font-semibold text-sm sm:text-base transition-all text-center ${
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
              {residentInfo ? 'Ubicación Específica (Opcional)' : 'Ubicación *'}
            </div>
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required={!residentInfo}
            placeholder={residentInfo
              ? `Ej: Baño principal, Área de estacionamiento, etc. (Por defecto: Unidad ${residentInfo.unitNumber})`
              : 'Ej: Lobby, estacionamiento o jardín'}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Foto (Opcional) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center gap-2">
              <PhotoIcon className="w-5 h-5" />
              Foto de la Incidencia (Opcional)
            </div>
          </label>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Formatos permitidos: JPG, PNG, WEBP. Máximo 5MB.</p>

          {photoPreviewUrl && (
            <div className="mt-4">
              <img
                src={photoPreviewUrl}
                alt="Vista previa de incidencia"
                className="w-full max-h-64 object-cover rounded-xl border border-gray-200 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Quitar foto
              </button>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(incidentsPath)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-center"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
