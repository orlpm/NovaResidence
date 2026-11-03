import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { residentService } from '../../lib/residentService';
import { billingService, ChargeStatus, PaymentMethod, paymentMethodNames, type ChargePaymentDto } from '../../lib/billingService';
import { CreditCardIcon, ExclamationTriangleIcon, ClockIcon, BanknotesIcon, XMarkIcon, ArrowUpTrayIcon, DocumentIcon, ShieldCheckIcon, EyeIcon } from '@heroicons/react/24/outline';
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
  hasUnverifiedPayments: boolean;
  payments: ChargePaymentDto[];
}

function Payments() {
  const { user } = useAuthStore();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ChargeStatus | null>(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BankTransfer);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ChargePaymentDto | null>(null);

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

  const handlePayClick = (charge: Charge) => {
    setSelectedCharge(charge);
    setPaymentAmount(charge.balance.toFixed(2));
    setPaymentMethod(PaymentMethod.BankTransfer);
    setReferenceNumber('');
    setPaymentNotes('');
    setProofFile(null);
    setProofPreview(null);
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedCharge) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    if (amount > selectedCharge.balance) {
      toast.error('El monto no puede ser mayor al saldo pendiente');
      return;
    }
    if (paymentMethod === PaymentMethod.BankTransfer && !proofFile) {
      toast.error('Debes subir el comprobante de pago para transferencias bancarias');
      return;
    }

    setIsSubmitting(true);
    try {
      let proofImageUrl: string | undefined;

      // Upload proof file if bank transfer and file selected
      if (paymentMethod === PaymentMethod.BankTransfer && proofFile) {
        proofImageUrl = await billingService.uploadPaymentProof(proofFile);
      }

      await billingService.recordPayment({
        chargeId: selectedCharge.id,
        amount,
        paymentMethod,
        paymentDate: new Date().toISOString(),
        referenceNumber: referenceNumber || undefined,
        notes: paymentNotes || undefined,
        proofImageUrl,
      });

      if (paymentMethod === PaymentMethod.BankTransfer) {
        toast.success('Pago registrado. Tu comprobante será revisado por el administrador.');
      } else {
        toast.success('Pago registrado exitosamente');
      }
      setShowPaymentModal(false);
      setSelectedCharge(null);
      await loadCharges();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error?.response?.data?.message || 'Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato no válido. Use JPG, PNG, PDF o WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no debe superar los 5MB.');
      return;
    }

    setProofFile(file);
    if (file.type.startsWith('image/')) {
      setProofPreview(URL.createObjectURL(file));
    } else {
      setProofPreview(null);
    }
  };

  const filteredCharges = selectedStatus !== null 
    ? charges.filter(c => c.status === selectedStatus)
    : charges;

  const totalBalance = charges.reduce((sum, c) => sum + c.balance, 0);
  const totalOverdue = charges
    .filter(c => c.status === ChargeStatus.Overdue)
    .reduce((sum, c) => sum + c.balance, 0);

  const getStatusIcon = (charge: Charge) => {
    if (charge.hasUnverifiedPayments) {
      return <ClockIcon className="w-5 h-5 text-amber-600" />;
    }
    switch (charge.status) {
      case ChargeStatus.Paid:
        return <ShieldCheckIcon className="w-5 h-5 text-green-600" />;
      case ChargeStatus.Overdue:
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case ChargeStatus.Pending:
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <CreditCardIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (charge: Charge) => {
    if (charge.hasUnverifiedPayments) {
      return 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    switch (charge.status) {
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

  const getDisplayStatusName = (charge: Charge) => {
    if (charge.hasUnverifiedPayments) {
      return 'Pendiente de Verificación';
    }
    return charge.statusName;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Mis Pagos</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Estado de cuenta de tu unidad</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Por Verificar</h3>
            <ClockIcon className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-4xl font-black text-amber-600 dark:text-amber-400">
            {charges.filter(c => c.hasUnverifiedPayments).length}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Pagos en revisión</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Verificados</h3>
            <ShieldCheckIcon className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-4xl font-black text-green-600 dark:text-green-400">
            {charges.filter(c => c.status === ChargeStatus.Paid && !c.hasUnverifiedPayments).length}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Pagos confirmados</p>
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
                      {getStatusIcon(charge)}
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{charge.concept}</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{charge.feeTypeName}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(charge)}`}>
                    {getDisplayStatusName(charge)}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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

                {/* Verification Warning */}
                {charge.hasUnverifiedPayments && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <ClockIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Tienes pagos pendientes de verificación por el administrador. Una vez confirmados, el estatus se actualizará.
                      </p>
                    </div>
                  </div>
                )}

                {charge.balance > 0 && charge.status === ChargeStatus.Overdue && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
                    <p className="text-sm text-red-800 dark:text-red-300">
                      ⚠️ Este cargo está vencido. Por favor, realiza el pago lo antes posible.
                    </p>
                  </div>
                )}

                {/* Payment History */}
                {charge.payments && charge.payments.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <BanknotesIcon className="w-4 h-4" />
                      Historial de Pagos
                    </h4>
                    <div className="space-y-2">
                      {charge.payments.map(payment => (
                        <div
                          key={payment.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            payment.isRefunded
                              ? 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 opacity-60'
                              : payment.isVerified
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                ${payment.amount.toFixed(2)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {payment.paymentMethodName}
                              </span>
                              {payment.referenceNumber && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  Ref: {payment.referenceNumber}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(payment.paymentDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {payment.receiptNumber && (
                              <button
                                type="button"
                                onClick={() => setReceipt(payment)}
                                className="px-2 py-1 text-xs font-semibold rounded-lg bg-sky-100 text-sky-700"
                              >
                                Ver recibo
                              </button>
                            )}
                            {payment.proofImageUrl && (
                              <a
                                href={`http://localhost:5001${payment.proofImageUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded-lg transition-colors"
                                title="Ver comprobante"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </a>
                            )}
                            {payment.isRefunded ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                Reembolsado
                              </span>
                            ) : payment.isVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                                <ShieldCheckIcon className="w-3.5 h-3.5" />
                                Verificado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 animate-pulse">
                                <ClockIcon className="w-3.5 h-3.5" />
                                Por Verificar
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pay Button */}
                {charge.balance > 0 && charge.status !== ChargeStatus.Cancelled && charge.status !== ChargeStatus.Forgiven && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handlePayClick(charge)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <BanknotesIcon className="w-5 h-5" />
                      Pagar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Payment Modal */}
      {showPaymentModal && selectedCharge && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-xl">
                  <BanknotesIcon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registrar Pago</h2>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Charge Info */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-1">Cargo</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedCharge.concept}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCharge.feeTypeName}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monto total</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white">${selectedCharge.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Saldo pendiente</p>
                  <p className="text-base font-bold text-red-600 dark:text-red-400">${selectedCharge.balance.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="p-6 space-y-5">
              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Monto a pagar *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedCharge.balance}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(selectedCharge.balance.toFixed(2))}
                    className="text-xs px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-lg font-semibold hover:bg-sky-200 dark:hover:bg-sky-900/50 transition-colors"
                  >
                    Pagar total
                  </button>
                  {selectedCharge.balance > 100 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount((selectedCharge.balance / 2).toFixed(2))}
                      className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Pagar mitad
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Método de pago *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(paymentMethodNames).map(([key, name]) => {
                    const methodKey = parseInt(key) as PaymentMethod;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPaymentMethod(methodKey)}
                        className={`px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          paymentMethod === methodKey
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Número de referencia
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
                  placeholder="Ej: Folio de transferencia, número de cheque..."
                />
              </div>

              {/* Proof Upload - Only for Bank Transfer */}
              {paymentMethod === PaymentMethod.BankTransfer && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Comprobante de pago *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-sky-400 dark:hover:border-sky-500 transition-colors">
                    {proofFile ? (
                      <div className="space-y-3">
                        {proofPreview ? (
                          <img src={proofPreview} alt="Comprobante" className="max-h-40 mx-auto rounded-lg object-contain" />
                        ) : (
                          <div className="flex items-center justify-center gap-2 text-sky-600 dark:text-sky-400">
                            <DocumentIcon className="w-8 h-8" />
                            <span className="font-semibold">{proofFile.name}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(proofFile.size / 1024).toFixed(0)} KB
                        </p>
                        <button
                          type="button"
                          onClick={() => { setProofFile(null); setProofPreview(null); }}
                          className="text-sm text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-300"
                        >
                          Eliminar archivo
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <ArrowUpTrayIcon className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                          Haz clic para subir tu comprobante
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          JPG, PNG, PDF o WEBP (máx. 5MB)
                        </p>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,.webp"
                          onChange={handleProofFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      ⚠️ Los pagos por transferencia bancaria requieren confirmación del administrador. 
                      Tu pago quedará en estado <strong>pendiente de verificación</strong> hasta ser revisado.
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Notas adicionales
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors resize-none"
                  placeholder="Comentarios opcionales sobre el pago..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <BanknotesIcon className="w-5 h-5" />
                    Confirmar Pago
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6 space-y-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recibo de pago</h2>
            <p className="text-sm text-gray-500">Folio {receipt.receiptNumber}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">${receipt.amount.toFixed(2)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{receipt.paymentMethodName}</p>
            <div className="flex justify-end">
              <button onClick={() => setReceipt(null)} className="px-4 py-2 rounded-lg bg-sky-600 text-white">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;
