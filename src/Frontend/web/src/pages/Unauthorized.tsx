import { ShieldX, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleGoHome = () => {
    // Redirect based on user role
    if (user?.role === 'Admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/resident/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <ShieldX className="w-24 h-24 mx-auto text-red-500" />
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Acceso Denegado
        </h1>
        
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          No tienes permisos para acceder a esta página.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={handleGoHome}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            Volver al Inicio
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="w-full px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            Volver Atrás
          </button>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Si crees que deberías tener acceso a esta página, contacta al administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
