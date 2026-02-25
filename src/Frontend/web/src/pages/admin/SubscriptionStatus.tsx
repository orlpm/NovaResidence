import { useState, useEffect } from 'react';
import {
  CreditCard, Clock, AlertTriangle, CheckCircle, Gift,
  Calendar, DollarSign, Timer, Shield, Building2,
  RefreshCw, FileText, XCircle, Ban, ChevronRight
} from 'lucide-react';
import {
  subscriptionService,
  type SubscriptionDetail,
  type SubscriptionPlan
} from '../../lib/subscriptionService';
import { useAuthStore } from '../../stores/authStore';

const STATUS_UI: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType; description: string }> = {
  Trial:     { label: 'Período de Prueba Gratis', color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-500/10',     border: 'border-blue-200 dark:border-blue-500/30', icon: Gift,          description: 'Estás disfrutando de tu mes de prueba gratuito. Cuando finalice, necesitarás realizar un pago para continuar.' },
  Active:    { label: 'Suscripción Activa',       color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10',   border: 'border-green-200 dark:border-green-500/30', icon: CheckCircle, description: 'Tu suscripción está activa y al corriente. ¡Todo en orden!' },
  PastDue:   { label: 'Pago Vencido',             color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/30', icon: AlertTriangle, description: 'Tu pago está vencido. Realiza el pago antes de que se suspenda tu acceso.' },
  Suspended: { label: 'Acceso Suspendido',        color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-500/10',       border: 'border-red-200 dark:border-red-500/30',   icon: Ban,           description: 'Tu acceso ha sido suspendido por falta de pago. Contacta a soporte o realiza el pago pendiente.' },
  Cancelled: { label: 'Suscripción Cancelada',    color: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-500/10',     border: 'border-gray-200 dark:border-gray-500/30', icon: XCircle,       description: 'Tu suscripción fue cancelada. Contacta a soporte para reactivarla.' },
  Expired:   { label: 'Suscripción Expirada',     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/30', icon: Clock, description: 'Tu período de prueba o suscripción ha expirado. Realiza un pago para continuar usando la plataforma.' },
};

export default function SubscriptionStatusPage() {
  const { user } = useAuthStore();
  const [subscription, setSubscription] = useState<SubscriptionDetail | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [noSubscription, setNoSubscription] = useState(false);

  // Payment form
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMonths, setPayMonths] = useState(1);
  const [payMethod, setPayMethod] = useState('BankTransfer');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [planChanging, setPlanChanging] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchCondominiumAndSubscription();
    subscriptionService.getPlans().then(setPlans).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const fetchCondominiumAndSubscription = async () => {
    try {
      setLoading(true);
      const sub = user?.id
        ? await subscriptionService.getSubscriptionByUser(user.id)
        : await subscriptionService.getMySubscription();
      setSubscription(sub);
      setSelectedPlanId(sub.plan.id);
      setNoSubscription(false);
      return sub;
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 401) {
        setSubscription(null);
        setSelectedPlanId('');
        setNoSubscription(true);
      } else {
        console.error('Error fetching subscription:', error);
        setFeedback({ type: 'error', message: 'Error al cargar la suscripción' });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const estimateMonthlyAmount = (planId: string, currentSubscription: SubscriptionDetail) => {
    if (!planId || planId === currentSubscription.plan.id) return currentSubscription.monthlyAmount;
    const selected = plans.find(p => p.id === planId);
    if (!selected) return currentSubscription.monthlyAmount;
    if (selected.isCustom && selected.fixedMonthlyPrice != null) return selected.fixedMonthlyPrice;
    return selected.pricePerUnit * Math.max(currentSubscription.billedUnits, 1);
  };

  const handlePayment = async () => {
    if (!subscription) return;
    setPayLoading(true);
    try {
      let currentSubscription = subscription;

      if (selectedPlanId && selectedPlanId !== subscription.plan.id) {
        setPlanChanging(true);
        await subscriptionService.changePlan(subscription.id, selectedPlanId);
        const refreshed = user?.id
          ? await subscriptionService.getSubscriptionByUser(user.id)
          : await subscriptionService.getMySubscription();
        setSubscription(refreshed);
        currentSubscription = refreshed;
        setPlanChanging(false);
      }

      const amount = parseFloat(payAmount) || currentSubscription.monthlyAmount * payMonths;
      await subscriptionService.registerPayment(
        currentSubscription.id,
        amount,
        payMonths,
        payMethod,
        payReference || undefined,
        payNotes || undefined
      );
      setFeedback({ type: 'success', message: '¡Pago registrado exitosamente! Tu suscripción ha sido renovada.' });
      setShowPayment(false);
      setPayReference('');
      setPayNotes('');
      await fetchCondominiumAndSubscription();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error?.response?.data?.message || 'Error al registrar el pago' });
    } finally {
      setPlanChanging(false);
      setPayLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  const getStatusUI = (statusText: string) =>
    STATUS_UI[statusText] || STATUS_UI.Expired;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (noSubscription) {
    return (
      <div className="max-w-5xl mx-auto py-10 space-y-8">
        <div className="text-center">
          <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 inline-block mb-6">
            <CreditCard className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sin Suscripción</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Aún no tienes una suscripción activa. Crea un condominio para obtener tu período de prueba gratuito.
          </p>
          <button
            onClick={fetchCondominiumAndSubscription}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reintentar
          </button>
        </div>

        {plans.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-500" />
              Planes Disponibles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map(plan => {
                const features = subscriptionService.parseFeatures(plan.features);
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border-2 p-6 transition-all ${
                      plan.isRecommended
                        ? 'border-indigo-300 dark:border-indigo-500/30 bg-white dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    {plan.isRecommended && (
                      <span className="inline-block text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10 px-2 py-1 rounded-full mb-3">
                        ⭐ Recomendado
                      </span>
                    )}
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h4>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.pricePerUnit}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm"> /unidad/mes</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {plan.minUnits}–{plan.maxUnits || '∞'} unidades · {plan.trialDays} días de prueba
                    </p>
                    {features.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <ChevronRight className="w-3 h-3 text-sky-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!subscription) return null;

  const STATUS_KEYS = ['Trial', 'Active', 'PastDue', 'Suspended', 'Cancelled', 'Expired'];
  const statusKey = STATUS_KEYS[subscription.status] || 'Expired';
  const ui = getStatusUI(statusKey);
  const StatusIcon = ui.icon;
  const daysRemaining = subscription.daysRemaining;
  const progressPercent = Math.min(100, (daysRemaining / 30) * 100);
  const isUrgent = daysRemaining <= 7;
  const isWarning = daysRemaining <= 15 && daysRemaining > 7;
  const needsPayment = ['PastDue', 'Suspended', 'Expired'].includes(statusKey);
  const selectedPlanChanged = !!selectedPlanId && selectedPlanId !== subscription.plan.id;
  const selectedMonthlyAmount = estimateMonthlyAmount(selectedPlanId, subscription);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/30">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          Mi Suscripción
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Estado actual de tu plan y renovación</p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl border ${
          feedback.type === 'success'
            ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Status Banner */}
      <div className={`rounded-2xl border-2 p-6 ${ui.bg} ${ui.border}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${ui.bg}`}>
            <StatusIcon className={`w-8 h-8 ${ui.color}`} />
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${ui.color}`}>{ui.label}</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">{ui.description}</p>

            {/* Days remaining bar */}
            {statusKey !== 'Cancelled' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tiempo restante</span>
                  <span className={`text-lg font-bold ${
                    isUrgent ? 'text-red-600 dark:text-red-400' :
                    isWarning ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-green-600 dark:text-green-400'
                  }`}>
                    {daysRemaining} días
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      isUrgent ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {isUrgent && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    ¡Tu suscripción vence pronto! Renueva para no perder el acceso.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard icon={Building2} label="Plan" value={subscription.plan.name} sub={subscription.plan.isCustom ? 'Plan personalizado' : `$${subscription.plan.pricePerUnit}/unidad`} />
        <InfoCard icon={DollarSign} label="Monto Mensual" value={`$${subscription.monthlyAmount.toLocaleString()} MXN`} sub={`${subscription.billedUnits} unidades facturadas`} />
        <InfoCard icon={Calendar} label="Vencimiento" value={formatDate(subscription.currentPeriodEnd)} sub={statusKey === 'Trial' ? `Prueba hasta ${formatDate(subscription.trialEndDate)}` : `Desde ${formatDate(subscription.currentPeriodStart)}`} />
        <InfoCard icon={Timer} label="Último Pago" value={formatDate(subscription.lastPaymentDate)} sub={subscription.recentPayments.length > 0 ? `${subscription.recentPayments.length} pago(s) registrados` : 'Sin pagos aún'} />
      </div>

      {/* Pay / Renew Button */}
      {(needsPayment || isUrgent || isWarning || statusKey === 'Trial') && (
        <div className="bg-gradient-to-r from-sky-500/10 to-blue-600/10 dark:from-sky-500/5 dark:to-blue-600/5 rounded-2xl border border-sky-200 dark:border-sky-500/20 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {needsPayment ? '⚠️ Pago requerido' : statusKey === 'Trial' ? '🎁 Tu prueba gratis termina pronto' : '🔄 Renovar suscripción'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {needsPayment
                  ? 'Realiza tu pago para restaurar el acceso a la plataforma.'
                  : `Monto mensual: $${selectedMonthlyAmount.toLocaleString()} MXN`}
              </p>
            </div>
            <button
              onClick={() => { setShowPayment(!showPayment); setPayAmount((selectedMonthlyAmount * payMonths).toString()); }}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all flex items-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              {needsPayment ? 'Realizar Pago' : 'Renovar Ahora'}
            </button>
          </div>

          {/* Payment Form */}
          {showPayment && (
            <div className="mt-6 pt-6 border-t border-sky-200 dark:border-sky-500/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan a pagar</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => {
                      const newPlanId = e.target.value;
                      setSelectedPlanId(newPlanId);
                      const newMonthly = estimateMonthlyAmount(newPlanId, subscription);
                      setPayAmount((newMonthly * payMonths).toString());
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} {plan.id === subscription.plan.id ? '(actual)' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedPlanChanged && (
                    <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
                      Se actualizará tu suscripción al plan seleccionado antes de registrar el pago.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meses a pagar</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 6, 12].map(m => (
                      <button
                        key={m}
                        onClick={() => { setPayMonths(m); setPayAmount((selectedMonthlyAmount * m).toString()); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          payMonths === m
                            ? 'bg-sky-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto Total</label>
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ${selectedMonthlyAmount.toLocaleString()} × {payMonths} mes(es) = ${(selectedMonthlyAmount * payMonths).toLocaleString()} MXN
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Pago</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="BankTransfer">Transferencia Bancaria</option>
                    <option value="Card">Tarjeta de Crédito/Débito</option>
                    <option value="Cash">Efectivo</option>
                    <option value="DirectDebit">Pago Domiciliado</option>
                    <option value="Other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Referencia de Pago</label>
                  <input
                    type="text"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="Número de transferencia, folio..."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas (opcional)</label>
                  <textarea
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    rows={2}
                    placeholder="Información adicional sobre el pago..."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowPayment(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handlePayment}
                  disabled={payLoading || planChanging}
                  className="px-6 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium rounded-lg shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 disabled:opacity-50 flex items-center gap-2"
                >
                  {payLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {planChanging ? 'Actualizando plan...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      {subscription.recentPayments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-500" />
              Historial de Pagos
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {subscription.recentPayments.map(payment => (
              <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${payment.isVerified ? 'bg-green-100 dark:bg-green-500/10' : 'bg-yellow-100 dark:bg-yellow-500/10'}`}>
                    {payment.isVerified
                      ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      : <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      ${payment.amount.toLocaleString()} MXN
                      <span className="text-gray-400 font-normal"> · {payment.monthsPaid} mes(es)</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(payment.paymentDate)} · {payment.paymentMethod}
                      {payment.referenceNumber && ` · Ref: ${payment.referenceNumber}`}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  payment.isVerified
                    ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                }`}>
                  {payment.isVerified ? 'Verificado' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Plans */}
      {plans.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-500" />
            Planes Disponibles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => {
              const features = subscriptionService.parseFeatures(plan.features);
              const isCurrent = subscription.plan.id === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border-2 p-6 transition-all ${
                    isCurrent
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/5 shadow-lg shadow-sky-500/10'
                      : plan.isRecommended
                        ? 'border-indigo-300 dark:border-indigo-500/30 bg-white dark:bg-gray-800'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  {isCurrent && (
                    <span className="inline-block text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-500/10 px-2 py-1 rounded-full mb-3">
                      Tu Plan Actual
                    </span>
                  )}
                  {plan.isRecommended && !isCurrent && (
                    <span className="inline-block text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10 px-2 py-1 rounded-full mb-3">
                      ⭐ Recomendado
                    </span>
                  )}
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h4>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">${plan.pricePerUnit}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm"> /unidad/mes</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {plan.minUnits}–{plan.maxUnits || '∞'} unidades · {plan.trialDays} días de prueba
                  </p>
                  {features.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <ChevronRight className="w-3 h-3 text-sky-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!isCurrent && (
                    <button
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setShowPayment(true);
                        setPayAmount((estimateMonthlyAmount(plan.id, subscription) * payMonths).toString());
                      }}
                      className="mt-4 w-full px-4 py-2 rounded-lg border border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"
                    >
                      Seleccionar este plan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-500/10">
          <Icon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
        </div>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
