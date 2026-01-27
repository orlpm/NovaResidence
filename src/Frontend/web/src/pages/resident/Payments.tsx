import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { residentService } from '../../lib/residentService';
import { billingService, ChargeStatus } from '../../lib/billingService';
import { CreditCardIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Charge {
  id: string;
  concept: string;
  feeTypeName: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: ChargeStatus;
  statusName: string;
  dueDate: string;
  billingPeriod: string;
}

function Payments() {
  const { user } = useAuthStore();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ChargeStatus | null>(null);

  useEffect(() => {
    loadCharges();
  }, [user?.id]);

  const loadCharges = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Obtener información del residente para conseguir la unidad
      const residentInfo = await residentService.getResidentInfo(user.id);
      if (residentInfo && residentInfo.unitId) {
        // Obtener cargos de la unidad
        const charges = await billingService.getUnitCharges(residentInfo.unitId);
        setCharges(charges as unknown as Charge[]);
      }
    } catch (error: any) {
      console.error('Error loading charges:', error);
      toast.error('Error al cargar los cargos');
    } finally {
      setLoading(false);
    }
  };

  const filteredCharges = selectedStatus !== null 
    ? charges.filter(c => c.status === selectedStatus)
    : charges;

  const totalBalance = charges.reduce((sum, c) => sum + c.balance, 0);
  const totalOverdue = charges
    .filter(c => c.status === ChargeStatus.Overdue)
    .reduce((sum, c) => sum + c.balance, 0);

  const getStatusIcon = (status: ChargeStatus) => {
    switch (status) {
      case ChargeStatus.Paid:
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case ChargeStatus.Overdue:
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case ChargeStatus.Pending:
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <CreditCardIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ChargeStatus) => {
    switch (status) {
      case ChargeStatus.Paid:
        return 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
      case ChargeStatus.Overdue:
        return 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
      case ChargeStatus.Pending:
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case ChargeStatus.PartiallyPaid:
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Mis Pagos</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Gestiona tus cargos y pagos</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Saldo Total</h3>
            <CreditCardIcon className="h-6 w-6 text-sky-500" />
          </div>
          <p className="text-4xl font-black text-sky-600 dark:text-sky-400">${totalBalance.toFixed(2)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{charges.length} cargos activos</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Vencidos</h3>
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-4xl font-black text-red-600 dark:text-red-400">${totalOverdue.toFixed(2)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Requieren atención</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Pagados</h3>
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-4xl font-black text-green-600 dark:text-green-400">
            {charges.filter(c => c.status === ChargeStatus.Paid).length}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Cargos pagados</p>
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
          Todos
        </button>
        <button
          onClick={() => setSelectedStatus(ChargeStatus.Pending)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === ChargeStatus.Pending
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Pendientes
        </button>
        <button
          onClick={() => setSelectedStatus(ChargeStatus.Overdue)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === ChargeStatus.Overdue
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Vencidos
        </button>
        <button
          onClick={() => setSelectedStatus(ChargeStatus.Paid)}
          className={`px-4 py-2 rounded-xl font-semibold transition-all ${
            selectedStatus === ChargeStatus.Paid
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Pagados
        </button>
      </div>

      {/* Charges List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando cargos...</p>
        </div>
      ) : filteredCharges.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
          <CreditCardIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">No hay cargos en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCharges.map(charge => (
            <div
              key={charge.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(charge.status)}
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{charge.concept}</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{charge.feeTypeName}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(charge.status)}`}>
                    {charge.statusName}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Monto</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">${charge.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Pagado</p>
                    <p className="text-lg font-black text-green-600 dark:text-green-400">${charge.paidAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Saldo</p>
                    <p className={`text-lg font-black ${charge.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      ${charge.balance.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Vencimiento</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {new Date(charge.dueDate).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>

                {charge.balance > 0 && charge.status === ChargeStatus.Overdue && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mt-4">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      ⚠️ Este cargo está vencido. Por favor, realiza el pago lo antes posible.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Payments;
