import { useState, useEffect, type ReactNode } from 'react';
import { subscriptionService, type SubscriptionStatus } from '../../lib/subscriptionService';
import { useAuthStore } from '../../stores/authStore';
import SubscriptionExpired from '../../pages/subscription/SubscriptionExpired';

interface SubscriptionGuardProps {
  children: ReactNode;
}

/**
 * Wraps admin/subadmin content and checks subscription status.
 * If subscription is expired/suspended, shows the payment page instead of the content.
 * SuperAdmin role bypasses this check.
 */
export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const userId = user?.id;
  const isSuperAdmin = (user?.role as string) === 'superadmin' || user?.defaultRole === 'SuperAdmin';

  useEffect(() => {
    // SuperAdmin bypasses subscription checks
    if (isSuperAdmin || !userId) {
      setLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        setLoading(true);
        const subscriptionStatus = await subscriptionService.getStatus(userId);
        setStatus(subscriptionStatus);
      } catch (err: any) {
        // If 402, the middleware already blocked — we handle it
        if (err?.response?.status === 402) {
          const data = err.response.data;
          setStatus({
            hasSubscription: true,
            isAccessGranted: false,
            status: data.subscriptionStatus || 'Expired',
            statusText: data.subscriptionStatus || 'Expirada',
            monthlyAmount: data.monthlyAmount || 0,
            billedUnits: data.billedUnits || 0,
            daysRemaining: 0,
            planName: data.planName || '',
            currentPeriodEnd: data.currentPeriodEnd || '',
            trialEndDate: data.trialEndDate || null
          });
        } else {
          console.error('Error checking subscription:', err);
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [userId, isSuperAdmin]);

  // SuperAdmin always has access
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // No user ID — can't check subscription, allow access
  if (!userId) {
    return <>{children}</>;
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Verificando suscripción...</p>
        </div>
      </div>
    );
  }

  // Error loading status — allow access with warning
  if (error) {
    return <>{children}</>;
  }

  // Subscription blocked
  if (status && !status.isAccessGranted) {
    return (
      <SubscriptionExpired
        subscriptionInfo={{
          status: status.status,
          message: getBlockMessage(status.status),
          planName: status.planName,
          monthlyAmount: status.monthlyAmount,
          billedUnits: status.billedUnits,
          trialEndDate: status.trialEndDate ?? undefined
        }}
      />
    );
  }

  // Access granted
  return <>{children}</>;
}

function getBlockMessage(status: string): string {
  switch (status) {
    case 'Expired':
      return 'Tu período de prueba gratuito ha terminado. Realiza el pago para continuar usando la plataforma.';
    case 'Suspended':
      return 'Tu suscripción ha sido suspendida por falta de pago. Realiza el pago pendiente para reactivar el acceso.';
    case 'Cancelled':
      return 'Tu suscripción ha sido cancelada. Contacta al administrador para reactivarla.';
    case 'PastDue':
      return 'Tu pago está vencido. Realiza el pago lo antes posible para evitar la suspensión.';
    default:
      return 'Tu suscripción no está activa. Realiza el pago correspondiente para continuar.';
  }
}
