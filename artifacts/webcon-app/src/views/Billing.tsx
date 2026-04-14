import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Crown, Zap, Star, Check, Loader2, CreditCard,
  Gift, ArrowRight, BadgeCheck, AlertCircle
} from 'lucide-react';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceNgn: number;
  popular?: boolean;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', name: 'Starter', credits: 100, priceNgn: 1000 },
  { id: 'standard', name: 'Standard', credits: 500, priceNgn: 4500, popular: true },
  { id: 'pro_pack', name: 'Power', credits: 1200, priceNgn: 10000 },
  { id: 'mega', name: 'Mega', credits: 3000, priceNgn: 22000 },
];

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    priceNgn: 0,
    icon: <Star size={22} className="text-gray-400" />,
    color: 'border-gray-200',
    badge: null as string | null,
    features: [
      'Up to 5 AI agents',
      '1 credit per AI message',
      '100 credits per agent created',
      'Hub subscriptions (50 credits each)',
      'Workspace, notes & projects',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceNgn: 6000,
    icon: <Zap size={22} className="text-blue-500" />,
    color: 'border-blue-400',
    badge: 'Most Popular' as string | null,
    features: [
      'Unlimited AI agents',
      '200 bonus credits on subscribe',
      'Priority AI response speed',
      'Access to all learning hubs',
      'Everything in Free',
    ],
  },
  {
    id: 'creator',
    name: 'Creator',
    priceNgn: 15000,
    icon: <Crown size={22} className="text-yellow-500" />,
    color: 'border-yellow-400',
    badge: 'Best Value' as string | null,
    features: [
      'Unlimited AI agents — FREE to create',
      'Zero credit cost for AI messages',
      'Free learning hub subscriptions',
      'Create & monetise your own hubs',
      'Creator payouts via Paystack',
      'Everything in Pro',
    ],
  },
];

export function Billing() {
  const { user, refreshProfile } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const reference = params.get('reference');

    if (payment === 'success' && reference) {
      window.history.replaceState({}, '', '/billing');

      if (reference.startsWith('PLAN-')) {
        fetch(`/api/plans/verify?reference=${reference}`)
          .then(r => r.json())
          .then(async (data: { success?: boolean; alreadyProcessed?: boolean; planId?: string; bonusCredits?: number; error?: string }) => {
            if (data.success || data.alreadyProcessed) {
              const planName = data.planId
                ? data.planId.charAt(0).toUpperCase() + data.planId.slice(1)
                : 'Plan';
              const bonus = data.bonusCredits ? ` +${data.bonusCredits} bonus credits added!` : '';
              showToast('success', `${planName} plan activated!${bonus}`);
              await refreshProfile();
            } else {
              showToast('error', data.error || 'Could not verify plan payment.');
            }
          })
          .catch(() => showToast('error', 'Error verifying plan payment.'));
      } else {
        fetch(`/api/credits/verify?reference=${reference}`)
          .then(r => r.json())
          .then(async (data: { success?: boolean; credits?: number; error?: string }) => {
            if (data.success) {
              showToast('success', `${data.credits} credits added to your account!`);
              await refreshProfile();
            } else {
              showToast('error', data.error || 'Could not verify credit purchase.');
            }
          })
          .catch(() => showToast('error', 'Error verifying payment.'));
      }
    }
  }, [refreshProfile]);

  const handleBuyPlan = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/plans/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json() as { authorizationUrl?: string; error?: string };
      if (!res.ok || !data.authorizationUrl) {
        showToast('error', data.error || 'Could not start payment.');
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleBuyCredits = async (pkg: CreditPackage) => {
    setLoadingPkg(pkg.id);
    try {
      const res = await fetch('/api/credits/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json() as { authorizationUrl?: string; error?: string };
      if (!res.ok || !data.authorizationUrl) {
        showToast('error', data.error || 'Could not start payment.');
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setLoadingPkg(null);
    }
  };

  const currentPlan = user?.subscriptionPlan ?? 'free';
  const planExpiry = user?.subscriptionExpiresAt
    ? new Date(user.subscriptionExpiresAt).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-10">

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <BadgeCheck size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Current Plan</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-base font-semibold capitalize text-gray-800">{currentPlan}</span>
            {currentPlan !== 'free' && planExpiry && (
              <span className="text-xs text-gray-500">· renews {planExpiry}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Credits</p>
          <p className="text-base font-semibold text-gray-800 mt-1">{user?.creditBalance ?? 0}</p>
        </div>
      </div>

      {/* Plans */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Subscription Plans
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isActive = currentPlan === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl border-2 p-5 flex flex-col gap-4 bg-white ${plan.color} ${
                  isActive ? 'ring-2 ring-offset-1 ring-blue-400' : ''
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {plan.icon}
                  <span className="font-semibold text-gray-800">{plan.name}</span>
                  {isActive && <BadgeCheck size={14} className="text-blue-500 ml-auto" />}
                </div>

                <div>
                  {plan.priceNgn === 0 ? (
                    <span className="text-2xl font-bold text-gray-800">Free</span>
                  ) : (
                    <span className="text-2xl font-bold text-gray-800">
                      ₦{plan.priceNgn.toLocaleString()}
                      <span className="text-sm font-normal text-gray-500">/mo</span>
                    </span>
                  )}
                </div>

                <ul className="space-y-1.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check size={13} className="text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.id === 'free' ? (
                  <div
                    className={`text-center text-xs py-2 rounded-lg font-medium ${
                      isActive ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    {isActive ? 'Current Plan' : 'Default'}
                  </div>
                ) : isActive ? (
                  <div className="text-center text-xs py-2 rounded-lg font-medium bg-blue-50 text-blue-600">
                    Active · expires {planExpiry}
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuyPlan(plan.id)}
                    disabled={!!isLoading}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        Upgrade <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Credits */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Buy Credits</h2>
          {currentPlan === 'creator' && (
            <span className="text-[10px] font-bold uppercase tracking-widest bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              Not needed on Creator plan
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CREDIT_PACKAGES.map((pkg) => {
            const isLoading = loadingPkg === pkg.id;
            return (
              <div
                key={pkg.id}
                className={`relative rounded-xl border p-4 flex flex-col gap-3 bg-white hover:border-gray-400 transition ${
                  pkg.popular ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 left-3 text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{pkg.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Gift size={12} className="text-blue-500" />
                    <span className="text-xs text-blue-600 font-medium">{pkg.credits} credits</span>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-800">₦{pkg.priceNgn.toLocaleString()}</p>
                <button
                  onClick={() => handleBuyCredits(pkg)}
                  disabled={!!isLoading}
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 transition disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <>
                      <CreditCard size={12} /> Buy
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          1 credit per AI message · 100 credits per agent · 50 credits per hub subscription. Payments secured by Paystack.
        </p>
      </section>
    </div>
  );
}

export default Billing;
