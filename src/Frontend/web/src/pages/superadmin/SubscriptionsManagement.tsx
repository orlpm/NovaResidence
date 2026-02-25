import { useState, useEffect } from 'react';
import {
  CreditCard, Search, Clock, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Gift, Calendar, DollarSign, Building2,
  Timer, Shield, ArrowUpRight, RefreshCw, X, Ban, Play
} from 'lucide-react';
import { subscriptionService, type SubscriptionListItem } from '../../lib/subscriptionService';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  Trial:     { label: 'Prueba Gratis',  color: 'text-blue-400',   bg: 'bg-blue-500/20 border-blue-500/30',   icon: Gift },
  Active:    { label: 'Activa',         color: 'text-green-400',  bg: 'bg-green-500/20 border-green-500/30', icon: CheckCircle },
  PastDue:   { label: 'Pago Vencido',   color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', icon: AlertTriangle },
  Suspended: { label: 'Suspendida',     color: 'text-red-400',    bg: 'bg-red-500/20 border-red-500/30',     icon: Ban },
  Cancelled: { label: 'Cancelada',      color: 'text-gray-400',   bg: 'bg-gray-500/20 border-gray-500/30',   icon: XCircle },
  Expired:   { label: 'Expirada',       color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30', icon: Clock },
};

export default function SubscriptionsManagement() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Action modals
  const [actionModal, setActionModal] = useState<{
    type: 'extend' | 'condone' | 'status';
    subscription: SubscriptionListItem;
  } | null>(null);
  const [actionMonths, setActionMonths] = useState(1);
  const [actionDays, setActionDays] = useState(0);
  const [actionReason, setActionReason] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Stats
  const stats = {
    total: subscriptions.length,
    trial: subscriptions.filter(s => s.statusText === 'Trial').length,
    active: subscriptions.filter(s => s.statusText === 'Active').length,
    pastDue: subscriptions.filter(s => s.statusText === 'PastDue').length,
    suspended: subscriptions.filter(s => s.statusText === 'Suspended').length,
    expired: subscriptions.filter(s => s.statusText === 'Expired' || s.statusText === 'Cancelled').length,
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const result: any = await subscriptionService.getAllSubscriptions(undefined, 1, 100);
      setSubscriptions(result.data || result || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setFeedback({ type: 'error', message: 'Error al cargar las suscripciones' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = subscriptions.filter(s => {
    const matchesSearch =
      s.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.planName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.statusText === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleExtend = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      await subscriptionService.extendSubscription(
        actionModal.subscription.id,
        actionMonths,
        actionDays,
        actionReason || undefined
      );
      const extensionText = actionMonths > 0 && actionDays > 0
        ? `${actionMonths} mes(es) y ${actionDays} día(s)`
        : actionMonths > 0
          ? `${actionMonths} mes(es)`
          : `${actionDays} día(s)`;
      setFeedback({ type: 'success', message: `Suscripción extendida ${extensionText}` });
      setActionModal(null);
      setActionMonths(1);
      setActionDays(0);
      setActionReason('');
      await loadSubscriptions();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error?.response?.data?.message || 'Error al extender' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCondone = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      await subscriptionService.condoneSubscription(actionModal.subscription.id, actionMonths, actionReason || undefined);
      setFeedback({ type: 'success', message: `Pago condonado por ${actionMonths} mes(es)` });
      setActionModal(null);
      setActionMonths(1);
      setActionReason('');
      await loadSubscriptions();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error?.response?.data?.message || 'Error al condonar' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!actionModal || !actionStatus) return;
    setActionLoading(true);
    try {
      await subscriptionService.changeStatus(actionModal.subscription.id, actionStatus, actionReason || undefined);
      setFeedback({ type: 'success', message: 'Estado actualizado' });
      setActionModal(null);
      setActionStatus('');
      setActionReason('');
      await loadSubscriptions();
    } catch (error: any) {
      setFeedback({ type: 'error', message: error?.response?.data?.message || 'Error al cambiar estado' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const getDaysColor = (days: number, status: string) => {
    if (status === 'Active' && days > 15) return 'text-green-400';
    if (days <= 7) return 'text-red-400';
    if (days <= 15) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getStatusConfig = (statusText: string) =>
    STATUS_CONFIG[statusText] || STATUS_CONFIG.Expired;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500">
              <CreditCard className="w-6 h-6 text-purple-900" />
            </div>
            Gestión de Suscripciones
          </h1>
          <p className="text-gray-400 mt-2">Administra suscripciones por usuario administrador</p>
        </div>
        <button
          onClick={loadSubscriptions}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`p-4 rounded-lg border ${
          feedback.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'from-purple-500 to-indigo-500', icon: Building2 },
          { label: 'Prueba', value: stats.trial, color: 'from-blue-500 to-cyan-500', icon: Gift },
          { label: 'Activas', value: stats.active, color: 'from-green-500 to-emerald-500', icon: CheckCircle },
          { label: 'Pago Vencido', value: stats.pastDue, color: 'from-yellow-500 to-amber-500', icon: AlertTriangle },
          { label: 'Suspendidas', value: stats.suspended, color: 'from-red-500 to-rose-500', icon: Ban },
          { label: 'Expiradas', value: stats.expired, color: 'from-gray-500 to-gray-600', icon: XCircle },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className={`inline-flex p-2 rounded-lg bg-gradient-to-r ${stat.color} mb-2`}>
              <stat.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500"
        >
          <option value="all">Todos los estados</option>
          <option value="Trial">🎁 Prueba</option>
          <option value="Active">✅ Activas</option>
          <option value="PastDue">⚠️ Pago Vencido</option>
          <option value="Suspended">🚫 Suspendidas</option>
          <option value="Expired">⏰ Expiradas</option>
          <option value="Cancelled">❌ Canceladas</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No se encontraron suscripciones</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Administrador</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Monto Mensual</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Días Restantes</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Vencimiento</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filtered.map(sub => {
                  const sc = getStatusConfig(sub.statusText);
                  const StatusIcon = sc.icon;
                  const isExpanded = expandedId === sub.id;

                  return (
                    <>
                      <tr
                        key={sub.id}
                        className="group hover:bg-gray-700/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                      >
                        <td className="px-4 py-3 align-middle">
                          <p className="text-sm font-medium text-white truncate">{sub.adminName}</p>
                          <p className="text-xs text-gray-500 truncate">{sub.adminEmail}</p>
                          <p className="text-xs text-gray-600">{sub.condominiumCount} condominio(s) · {sub.billedUnits} unidades</p>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <p className="text-sm text-gray-300">{sub.planName}</p>
                          <p className="text-xs text-gray-500">${sub.planPricePerUnit}/unidad</p>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap">
                          <p className="text-sm font-semibold text-white">${sub.monthlyAmount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">MXN/mes</p>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <p className={`text-sm font-bold ${getDaysColor(sub.daysRemaining, sub.statusText)}`}>
                            {sub.daysRemaining} días
                          </p>
                          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                sub.daysRemaining > 15 ? 'bg-green-500' :
                                sub.daysRemaining > 7 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, (sub.daysRemaining / 30) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle whitespace-nowrap text-xs text-gray-400">
                          {formatDate(sub.currentPeriodEnd)}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'extend', subscription: sub }); }}
                              className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
                              title="Extender"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'condone', subscription: sub }); }}
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors"
                              title="Condonar"
                            >
                              <Gift className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'status', subscription: sub }); }}
                              className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                              title="Cambiar Estado"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-700/20">
                          <td colSpan={7} className="px-6 pb-4 pt-2 border-t border-gray-700/50">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                              <DetailItem icon={Calendar} label="Fecha Inicio" value={formatDate(sub.startDate)} />
                              <DetailItem icon={Gift} label="Fin Prueba" value={formatDate(sub.trialEndDate)} />
                              <DetailItem icon={Timer} label="Período Actual" value={`${formatDate(sub.currentPeriodStart)} — ${formatDate(sub.currentPeriodEnd)}`} />
                              <DetailItem icon={DollarSign} label="Último Pago" value={formatDate(sub.lastPaymentDate)} />
                              <DetailItem icon={CreditCard} label="Método de Pago" value={sub.paymentMethod || 'Sin pagos'} />
                              <DetailItem icon={CheckCircle} label="Total Pagos" value={`${sub.totalPayments} pago(s)`} />
                              <DetailItem icon={Clock} label="Gracia" value={`${sub.gracePeriodDays} días`} />
                              <DetailItem
                                icon={Shield}
                                label="Acceso"
                                value={sub.isAccessGranted ? '✅ Permitido' : '🚫 Bloqueado'}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                {actionModal.type === 'extend' && '📅 Extender Suscripción'}
                {actionModal.type === 'condone' && '🎁 Condonar Pago'}
                {actionModal.type === 'status' && '🔄 Cambiar Estado'}
              </h3>
              <button
                onClick={() => { setActionModal(null); setActionMonths(1); setActionDays(0); setActionReason(''); setActionStatus(''); }}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Target info */}
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm font-medium text-white">{actionModal.subscription.adminName}</p>
                <p className="text-xs text-gray-400">
                  {actionModal.subscription.adminEmail} · Plan: {actionModal.subscription.planName} · ${actionModal.subscription.monthlyAmount.toLocaleString()}/mes
                </p>
              </div>

              {actionModal.type === 'status' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nuevo Estado</label>
                  <select
                    value={actionStatus}
                    onChange={(e) => setActionStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="activate">✅ Activar</option>
                    <option value="reactivate">🔄 Reactivar</option>
                    <option value="cancel">❌ Cancelar</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Meses {actionModal.type === 'extend' ? 'a extender' : 'a condonar'}
                    </label>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3, 6, 12].map(m => (
                        <button
                          key={m}
                          onClick={() => setActionMonths(m)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            actionMonths === m
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {actionModal.type === 'extend' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Días a extender</label>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={actionDays}
                        onChange={(e) => setActionDays(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                  )}

                  {actionModal.type === 'condone' && (
                    <p className="mt-2 text-xs text-yellow-400">
                      💰 Valor condonado: ${(actionModal.subscription.monthlyAmount * actionMonths).toLocaleString()} MXN
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Razón (opcional)</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={2}
                  placeholder="Ej: Promoción especial, problema de facturación..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => { setActionModal(null); setActionMonths(1); setActionDays(0); setActionReason(''); setActionStatus(''); }}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={
                  actionModal.type === 'extend' ? handleExtend :
                  actionModal.type === 'condone' ? handleCondone :
                  handleChangeStatus
                }
                disabled={
                  actionLoading ||
                  (actionModal.type === 'status' && !actionStatus) ||
                  (actionModal.type === 'extend' && actionMonths <= 0 && actionDays <= 0)
                }
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (
                  actionModal.type === 'extend' ? <><ArrowUpRight className="w-4 h-4" /> Extender</> :
                  actionModal.type === 'condone' ? <><Gift className="w-4 h-4" /> Condonar</> :
                  <><Play className="w-4 h-4" /> Aplicar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-200">{value}</p>
      </div>
    </div>
  );
}
