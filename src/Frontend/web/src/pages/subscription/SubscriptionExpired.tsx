import { useState, useEffect, useId } from 'react';
import { AlertTriangle, CreditCard, Check, Clock, Building2, ArrowRight, Shield, Star, Zap } from 'lucide-react';
import { createOpenPayCardToken } from '../../lib/openpay';
import { subscriptionService, type OpenPayPaymentResult, type SubscriptionPlan, type SubscriptionDetail, type PriceCalculation } from '../../lib/subscriptionService';
import toast from 'react-hot-toast';
import { uploadRejection } from '../../lib/uploadLimits';

interface SubscriptionExpiredProps {
  subscriptionInfo?: {
    status: string;
    message: string;
    planName?: string;
    monthlyAmount?: number;
    billedUnits?: number;
    trialEndDate?: string;
  };
}

export default function SubscriptionExpired({ subscriptionInfo }: SubscriptionExpiredProps) {
  const openPayFormId = useId().replace(/:/g, '');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [calculations, setCalculations] = useState<PriceCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openPayConfig, setOpenPayConfig] = useState<Awaited<ReturnType<typeof subscriptionService.getOpenPayConfig>> | null>(null);
  const [openPayLoading, setOpenPayLoading] = useState(true);
  const [openPayError, setOpenPayError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    monthsPaid: 1,
    paymentMethod: 'Card' as 'Card' | 'BankTransfer',
    referenceNumber: '',
    notes: ''
  });
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiryMonth, setCardExpiryMonth] = useState('');
  const [cardExpiryYear, setCardExpiryYear] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billingAddressLine1, setBillingAddressLine1] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let cancelled = false;

    subscriptionService.getOpenPayConfig()
      .then((config) => {
        if (cancelled) return;
        setOpenPayConfig(config);
        setOpenPayError(config.enabled ? null : 'OpenPay no está configurado todavía para cobros con tarjeta.');
        if (!config.enabled) {
          setPaymentData((current) => ({ ...current, paymentMethod: 'BankTransfer' }));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setOpenPayConfig(null);
        setOpenPayError('No se pudo cargar la configuración pública de OpenPay.');
        setPaymentData((current) => ({ ...current, paymentMethod: 'BankTransfer' }));
      })
      .finally(() => {
        if (!cancelled) setOpenPayLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!subscription) return;

    setCardHolderName((current) => current || subscription.adminName);
    setCustomerEmail((current) => current || subscription.adminEmail);
  }, [subscription]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, subscriptionData] = await Promise.allSettled([
        subscriptionService.getPlans(),
        subscriptionService.getMySubscription()
      ]);

      if (plansData.status === 'fulfilled') setPlans(plansData.value);

      if (subscriptionData.status === 'fulfilled') {
        setSubscription(subscriptionData.value);
        
        // Calculate prices based on current units
        const unitCount = subscriptionData.value.currentUnits || subscriptionData.value.billedUnits || 1;
        try {
          const calcs = await subscriptionService.calculatePrice(unitCount);
          setCalculations(calcs);
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error('Error loading subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!subscription) return;

    try {
      setSubmitting(true);
      setError('');

      if (paymentData.paymentMethod === 'Card') {
        if (!openPayConfig?.enabled) {
          throw new Error(openPayError || 'OpenPay no está disponible para pagos con tarjeta');
        }

        if (!cardHolderName.trim() || !cardNumber.trim() || !cardExpiryMonth.trim() || !cardExpiryYear.trim() || !cardCvv.trim()) {
          throw new Error('Completa los datos de la tarjeta antes de continuar');
        }

        if (!customerEmail.trim() || !billingAddressLine1.trim() || !billingPostalCode.trim()) {
          throw new Error('Captura correo, dirección y código postal para procesar el pago con OpenPay');
        }

        const { tokenId, deviceSessionId } = await createOpenPayCardToken(
          openPayConfig,
          openPayFormId,
          {
            holderName: cardHolderName.trim(),
            cardNumber,
            expirationMonth: cardExpiryMonth,
            expirationYear: cardExpiryYear,
            cvv2: cardCvv,
          },
        );

        const result = await subscriptionService.payWithOpenPayCard(subscription.id, {
          tokenId,
          deviceSessionId,
          monthsPaid: paymentData.monthsPaid,
          paymentMethod: 'Card',
          customerFullName: cardHolderName.trim() || subscription.adminName,
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim() || undefined,
          customerAddressLine1: billingAddressLine1.trim(),
          customerPostalCode: billingPostalCode.trim(),
          description: `Suscripción DomusCond - ${paymentData.monthsPaid} mes(es)`,
          notes: paymentData.notes || undefined,
        });

        const success = await handleOpenPayResponse(subscription, result);
        setSuccessMessage(success);
        setShowPaymentForm(false);
        resetPaymentForm();
        setTimeout(() => {
          window.location.reload();
        }, 3000);
        return;
      }

      if (!proofFile) {
        throw new Error('Debes adjuntar el comprobante para registrar la transferencia');
      }

      const proofUrl = await subscriptionService.uploadPaymentProof(proofFile);

      await subscriptionService.registerPayment(
        subscription.id,
        paymentData.amount,
        paymentData.monthsPaid,
        paymentData.paymentMethod,
        paymentData.referenceNumber || undefined,
        paymentData.notes || undefined,
        proofUrl
      );

      setSuccessMessage('¡Pago registrado exitosamente! Tu acceso será reactivado en breve.');
      setShowPaymentForm(false);
      resetPaymentForm();
      
      // Reload subscription data
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al registrar el pago. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayResponse = async (
    currentSubscription: SubscriptionDetail,
    result: OpenPayPaymentResult,
  ) => {
    if (result.currentPeriodEnd) {
      return result.message || 'Pago procesado exitosamente con OpenPay';
    }

    if (!result.transactionId) {
      return result.message || 'OpenPay respondió sin transacción confirmada';
    }

    const confirmation = await subscriptionService.confirmOpenPayPayment(currentSubscription.id, {
      transactionId: result.transactionId,
      monthsPaid: paymentData.monthsPaid,
      paymentMethod: 'Card',
      notes: paymentData.notes || undefined,
    });

    return confirmation.currentPeriodEnd
      ? confirmation.message || 'Pago confirmado y aplicado a la suscripción'
      : `${confirmation.message || 'Cargo enviado a validación'}. Folio OpenPay: ${result.transactionId}`;
  };

  const resetPaymentForm = () => {
    setProofFile(null);
    setPaymentData((current) => ({
      ...current,
      referenceNumber: '',
      notes: '',
    }));
    setCardNumber('');
    setCardExpiryMonth('');
    setCardExpiryYear('');
    setCardCvv('');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Trial': case 'Expired': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'PastDue': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Suspended': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'Expired': case 'Trial': return <Clock className="w-6 h-6" />;
      case 'PastDue': return <AlertTriangle className="w-6 h-6" />;
      case 'Suspended': return <Shield className="w-6 h-6" />;
      default: return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const getPlanIcon = (index: number) => {
    switch (index) {
      case 0: return <Building2 className="w-8 h-8 text-blue-500" />;
      case 1: return <Star className="w-8 h-8 text-indigo-500" />;
      case 2: return <Zap className="w-8 h-8 text-purple-500" />;
      default: return <Building2 className="w-8 h-8 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando información de suscripción...</p>
        </div>
      </div>
    );
  }

  const currentStatus = subscriptionInfo?.status || subscription?.statusText || 'Expirada';
  const message = subscriptionInfo?.message || 'Tu suscripción requiere atención para continuar usando la plataforma.';
  const unitCount = subscription?.currentUnits || subscription?.billedUnits || subscriptionInfo?.billedUnits || 0;
  const cardPaymentEnabled = !!openPayConfig?.enabled;
  const isCardPayment = paymentData.paymentMethod === 'Card';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Success message */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-6 flex items-center gap-4">
            <Check className="w-8 h-8 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-300">{successMessage}</h3>
              <p className="text-sm text-green-600 dark:text-green-400">Redirigiendo al panel...</p>
            </div>
          </div>
        )}

        {/* Status Banner */}
        <div className={`rounded-2xl p-8 border-2 ${getStatusColor(subscriptionInfo?.status || subscription?.statusText)} shadow-lg`}>
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 p-4 rounded-xl bg-white/50 dark:bg-black/20">
              {getStatusIcon(subscriptionInfo?.status || subscription?.statusText)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">
                Suscripción {currentStatus}
              </h1>
              <p className="text-lg opacity-90">{message}</p>
              
              {subscription && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3">
                    <p className="text-xs font-medium opacity-70">Plan Actual</p>
                    <p className="font-bold">{subscription.plan.name}</p>
                  </div>
                  <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3">
                    <p className="text-xs font-medium opacity-70">Unidades</p>
                    <p className="font-bold">{unitCount}</p>
                  </div>
                  <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3">
                    <p className="text-xs font-medium opacity-70">Monto Mensual</p>
                    <p className="font-bold">${subscription.monthlyAmount.toLocaleString('es-MX')} MXN</p>
                  </div>
                  <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3">
                    <p className="text-xs font-medium opacity-70">Días Restantes</p>
                    <p className="font-bold">{subscription.daysRemaining}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Form */}
        {showPaymentForm && subscription && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-blue-600" />
              Registrar Pago
            </h2>

            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monto a pagar (MXN)
                </label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-lg font-bold"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Monto mensual: ${subscription.monthlyAmount.toLocaleString('es-MX')} MXN
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meses a pagar
                </label>
                <select
                  value={paymentData.monthsPaid}
                  onChange={(e) => {
                    const months = parseInt(e.target.value);
                    setPaymentData({
                      ...paymentData,
                      monthsPaid: months,
                      amount: subscription.monthlyAmount * months
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  {[1, 2, 3, 6, 12].map(m => (
                    <option key={m} value={m}>
                      {m} {m === 1 ? 'mes' : 'meses'} — ${(subscription.monthlyAmount * m).toLocaleString('es-MX')} MXN
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Método de pago
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value as 'Card' | 'BankTransfer' })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="Card" disabled={!cardPaymentEnabled || openPayLoading}>Tarjeta con OpenPay</option>
                  <option value="BankTransfer">Transferencia Bancaria</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {isCardPayment
                    ? openPayLoading
                      ? 'Cargando OpenPay...'
                      : openPayError || `Cobro con tokenización segura en modo ${openPayConfig?.mode === 'sandbox' ? 'sandbox' : 'producción'}.`
                    : 'Este flujo registra la transferencia y la deja pendiente de validación por superadministración.'}
                </p>
              </div>

              {!isCardPayment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Referencia / Folio
                </label>
                <input
                  type="text"
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Número de referencia"
                />
              </div>
              )}

              {isCardPayment && (
                <form id={openPayFormId} className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={(event) => event.preventDefault()}>
                  <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
                    La tarjeta se tokeniza en tu navegador con OpenPay. El backend sólo recibe el token y el identificador del dispositivo.
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Titular de la tarjeta
                    </label>
                    <input
                      type="text"
                      value={cardHolderName}
                      onChange={(e) => setCardHolderName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="Nombre como aparece en la tarjeta"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Correo de facturación
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="correo@dominio.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Teléfono de contacto
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="5512345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={billingAddressLine1}
                      onChange={(e) => setBillingAddressLine1(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="Calle, número, colonia"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Código postal
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={billingPostalCode}
                      onChange={(e) => setBillingPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="01234"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Número de tarjeta
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, '').slice(0, 23))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="4111 1111 1111 1111"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mes de expiración
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp-month"
                      value={cardExpiryMonth}
                      onChange={(e) => setCardExpiryMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="08"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Año de expiración
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp-year"
                      value={cardExpiryYear}
                      onChange={(e) => setCardExpiryYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="29"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CVV
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      placeholder="123"
                    />
                  </div>
                </form>
              )}

              {!isCardPayment && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comprobante de transferencia
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,.webp"
                  onChange={(e) => {
                    const next = e.target.files?.[0] ?? null
                    if (next) {
                      const rejection = uploadRejection(next, ['jpg', 'jpeg', 'png', 'pdf', 'webp'])
                      if (rejection) {
                        toast.error(rejection)
                        e.target.value = ''
                        setProofFile(null)
                        return
                      }
                    }
                    setProofFile(next)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700"
                />
                <p className="mt-1 text-xs text-gray-500">Formatos permitidos: JPG, PNG, PDF o WEBP. Máximo 8MB.</p>
                {proofFile && <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">Archivo seleccionado: {proofFile.name}</p>}
              </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Notas adicionales del pago..."
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                disabled={submitting || paymentData.amount <= 0 || (isCardPayment && (!cardPaymentEnabled || openPayLoading))}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/25"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    {isCardPayment ? 'Pagar con OpenPay' : `Registrar transferencia de $${paymentData.amount.toLocaleString('es-MX')} MXN`}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!showPaymentForm && subscription && (
          <div className="text-center">
            <button
              onClick={() => {
                setPaymentData({
                  ...paymentData,
                  amount: subscription.monthlyAmount,
                  monthsPaid: 1,
                  paymentMethod: cardPaymentEnabled ? 'Card' : 'BankTransfer'
                });
                setShowPaymentForm(true);
              }}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/30 flex items-center gap-3 mx-auto"
            >
              <CreditCard className="w-6 h-6" />
              Realizar Pago — ${subscription.monthlyAmount.toLocaleString('es-MX')} MXN/mes
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Plans Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Planes Disponibles
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
            {unitCount > 0
              ? `Precio calculado para ${unitCount} unidades`
              : 'Selecciona el plan ideal para tu condominio'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const calc = calculations.find(c => c.planId === plan.id);
              const features = subscriptionService.parseFeatures(plan.features);
              const isCurrentPlan = subscription?.plan.id === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 border-2 transition-all ${
                    plan.isRecommended
                      ? 'border-indigo-500 bg-white dark:bg-gray-800 shadow-xl shadow-indigo-500/10 scale-105'
                      : isCurrentPlan
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                  }`}
                >
                  {plan.isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      RECOMENDADO
                    </div>
                  )}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      PLAN ACTUAL
                    </div>
                  )}

                  <div className="text-center mb-6">
                    {getPlanIcon(index)}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-3">{plan.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{plan.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                        ${plan.pricePerUnit.toFixed(0)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">/unidad/mes</span>
                    </div>
                    {calc && calc.isEligible && unitCount > 0 && (
                      <div className="mt-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-3">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Tu precio: <span className="font-bold text-lg text-gray-900 dark:text-white">
                            ${calc.monthlyTotal.toLocaleString('es-MX')}
                          </span> MXN/mes
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                    {plan.minUnits}–{plan.maxUnits ?? '∞'} unidades • {plan.trialDays} días gratis
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact info */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm space-y-2">
          <p>¿Necesitas un plan personalizado? Contacta a nuestro equipo.</p>
          <p className="font-medium">contacto@domuscond.com • +52 55 1234 5678</p>
        </div>
      </div>
    </div>
  );
}
