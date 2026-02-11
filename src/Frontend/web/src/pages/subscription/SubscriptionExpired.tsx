import { useState, useEffect } from 'react';
import { AlertTriangle, CreditCard, Check, Clock, Building2, ArrowRight, Shield, Star, Zap } from 'lucide-react';
import { subscriptionService, type SubscriptionPlan, type SubscriptionDetail, type PriceCalculation } from '../../lib/subscriptionService';

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
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [calculations, setCalculations] = useState<PriceCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    monthsPaid: 1,
    paymentMethod: 'BankTransfer',
    referenceNumber: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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

      await subscriptionService.registerPayment(
        subscription.id,
        paymentData.amount,
        paymentData.monthsPaid,
        paymentData.paymentMethod,
        paymentData.referenceNumber || undefined,
        paymentData.notes || undefined
      );

      setSuccessMessage('¡Pago registrado exitosamente! Tu acceso será reactivado en breve.');
      setShowPaymentForm(false);
      
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
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="BankTransfer">Transferencia Bancaria</option>
                  <option value="SPEI">SPEI</option>
                  <option value="CreditCard">Tarjeta de Crédito</option>
                  <option value="DebitCard">Tarjeta de Débito</option>
                  <option value="Cash">Efectivo</option>
                </select>
              </div>

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
                disabled={submitting || paymentData.amount <= 0}
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
                    Confirmar Pago de ${paymentData.amount.toLocaleString('es-MX')} MXN
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
                  monthsPaid: 1
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
          <p className="font-medium">soporte@novaresidence.com • +52 55 1234 5678</p>
        </div>
      </div>
    </div>
  );
}
