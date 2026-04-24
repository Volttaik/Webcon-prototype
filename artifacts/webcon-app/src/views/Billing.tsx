import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import AppHeader from '@/components/layout/AppHeader';
import { Toaster } from '@/components/ui/sonner';
import {
  Crown, Zap, Star, Check, Loader2, CreditCard,
  Gift, ArrowRight, BadgeCheck, AlertCircle, X, Sparkles,
} from 'lucide-react';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceNgn: number;
  popular?: boolean;
  badge?: string;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'trial',    name: 'Trial',    credits: 10,   priceNgn: 100,   badge: 'Try it' },
  { id: 'starter',  name: 'Starter',  credits: 100,  priceNgn: 1000 },
  { id: 'standard', name: 'Standard', credits: 500,  priceNgn: 4500,  popular: true },
  { id: 'pro_pack', name: 'Power',    credits: 1200, priceNgn: 10000 },
  { id: 'mega',     name: 'Mega',     credits: 3000, priceNgn: 22000 },
];

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    priceNgn: 0,
    icon: <Star size={22} className="text-muted-foreground" />,
    color: 'border-border',
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
    color: 'border-blue-500/40',
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
    color: 'border-yellow-500/40',
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

interface SuccessModal {
  credits: number;
  newBalance: number;
  packageName: string;
}

function CreditSuccessModal({ data, onClose }: { data: SuccessModal; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-8 shadow-elevation-xl text-center"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Success icon */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Check className="h-7 w-7 text-green-500" strokeWidth={2.5} />
              </div>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"
              >
                <Sparkles className="h-3 w-3 text-blue-500" />
              </motion.div>
            </div>
          </div>

          <h2 className="text-xl font-semibold tracking-tight mb-1">Payment successful!</h2>
          <p className="text-[13px] text-muted-foreground mb-6">
            Your {data.packageName} purchase has been confirmed.
          </p>

          {/* Credits added */}
          <div className="bg-secondary/40 border border-border rounded-2xl px-5 py-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Credits added</span>
              <span className="text-[15px] font-bold text-green-500">+{data.credits.toLocaleString()}</span>
            </div>
            <div className="border-t border-border/60" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">New balance</span>
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[15px] font-bold">{data.newBalance.toLocaleString()} credits</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground/60 mb-5">
            A receipt has been sent to your email.
          </p>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            Start learning
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function Billing() {
  const { user, refreshProfile } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPkg,  setLoadingPkg]  = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<SuccessModal | null>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const reference = params.get('reference');

    if (payment === 'success' && reference) {
      window.history.replaceState({}, '', '/billing');

      if (reference.startsWith('PLAN-')) {
        fetch(`/api/plans/verify?reference=${reference}`)
          .then(r => r.json())
          .then(async (data: { success?: boolean; alreadyProcessed?: boolean; planId?: string; bonusCredits?: number; error?: string }) => {
            if (data.success || data.alreadyProcessed) {
              await refreshProfile();
            } else {
              showError(data.error || 'Could not verify plan payment.');
            }
          })
          .catch(() => showError('Error verifying plan payment.'));
      } else {
        fetch(`/api/credits/verify?reference=${reference}`)
          .then(r => r.json())
          .then(async (data: { success?: boolean; credits?: number; balance?: number; error?: string }) => {
            if (data.success && data.credits) {
              await refreshProfile();
              const pkg = CREDIT_PACKAGES.find(p =>
                p.credits === data.credits
              );
              setSuccessModal({
                credits: data.credits,
                newBalance: data.balance ?? 0,
                packageName: pkg?.name ?? `${data.credits} Credits`,
              });
            } else {
              showError(data.error || 'Could not verify credit purchase.');
            }
          })
          .catch(() => showError('Error verifying payment.'));
      }
    }
  }, [refreshProfile]);

  const handleBuyPlan = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res  = await fetch('/api/plans/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json() as { authorizationUrl?: string; error?: string };
      if (!res.ok || !data.authorizationUrl) {
        showError(data.error || 'Could not start payment.');
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      showError('Network error. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleBuyCredits = async (pkg: CreditPackage) => {
    setLoadingPkg(pkg.id);
    try {
      const res  = await fetch('/api/credits/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json() as { authorizationUrl?: string; error?: string };
      if (!res.ok || !data.authorizationUrl) {
        showError(data.error || 'Could not start payment.');
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      showError('Network error. Please try again.');
    } finally {
      setLoadingPkg(null);
    }
  };

  const currentPlan = user?.subscriptionPlan ?? 'free';
  const planExpiry  = user?.subscriptionExpiresAt
    ? new Date(user.subscriptionExpiresAt).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster />

      {successModal && (
        <CreditSuccessModal
          data={successModal}
          onClose={() => setSuccessModal(null)}
        />
      )}

      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-elevation-lg text-sm font-medium bg-destructive text-destructive-foreground">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <main className="pt-12">
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-4xl mx-auto">
            <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-2">Billing</p>
            <h1 className="text-2xl font-semibold tracking-tight">Plans & Credits</h1>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

          {/* Status bar */}
          <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-4 shadow-elevation-sm">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Current Plan</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base font-semibold capitalize">{currentPlan}</span>
                {currentPlan !== 'free' && planExpiry && (
                  <span className="text-xs text-muted-foreground">· renews {planExpiry}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Credits</p>
              <p className="text-base font-semibold mt-1">{(user?.creditBalance ?? 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Plans */}
          <section>
            <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-4">
              Subscription Plans
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isActive  = currentPlan === plan.id;
                const isLoading = loadingPlan === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border-2 p-5 flex flex-col gap-4 bg-card shadow-elevation-sm ${plan.color} ${
                      isActive ? 'ring-2 ring-offset-2 ring-offset-background ring-blue-500/50' : ''
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      {plan.icon}
                      <span className="font-semibold">{plan.name}</span>
                      {isActive && <BadgeCheck size={14} className="text-blue-500 ml-auto" />}
                    </div>

                    <div>
                      {plan.priceNgn === 0 ? (
                        <span className="text-2xl font-bold">Free</span>
                      ) : (
                        <span className="text-2xl font-bold">
                          ₦{plan.priceNgn.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </span>
                      )}
                    </div>

                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check size={13} className="text-green-500 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {plan.id === 'free' ? (
                      <div className={`text-center text-xs py-2 rounded-lg font-medium ${
                        isActive ? 'bg-secondary text-muted-foreground' : 'bg-secondary/50 text-muted-foreground/60'
                      }`}>
                        {isActive ? 'Current Plan' : 'Default'}
                      </div>
                    ) : isActive ? (
                      <div className="text-center text-xs py-2 rounded-lg font-medium bg-blue-500/10 text-blue-500">
                        Active · expires {planExpiry}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleBuyPlan(plan.id)}
                        disabled={!!isLoading}
                        className="flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition disabled:opacity-50 shadow-elevation-sm"
                      >
                        {isLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>Upgrade <ArrowRight size={14} /></>
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
              <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Buy Credits</h2>
              {currentPlan === 'creator' && (
                <span className="text-[10px] font-bold uppercase tracking-widest bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">
                  Not needed on Creator plan
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CREDIT_PACKAGES.map((pkg) => {
                const isLoading = loadingPkg === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    className={`relative rounded-2xl border p-4 flex flex-col gap-3 bg-card hover:border-foreground/20 transition shadow-elevation-sm ${
                      pkg.popular ? 'border-blue-500/40 ring-1 ring-blue-500/20' : 'border-border'
                    }`}
                  >
                    {pkg.badge && !pkg.popular && (
                      <span className="absolute -top-2.5 left-3 text-[10px] font-bold uppercase tracking-widest bg-foreground text-background px-2 py-0.5 rounded-full">
                        {pkg.badge}
                      </span>
                    )}
                    {pkg.popular && (
                      <span className="absolute -top-2.5 left-3 text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-sm">{pkg.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Gift size={12} className="text-blue-500" />
                        <span className="text-xs text-blue-500 font-medium">{pkg.credits} credits</span>
                      </div>
                    </div>
                    <p className="text-lg font-bold">₦{pkg.priceNgn.toLocaleString()}</p>
                    <button
                      onClick={() => handleBuyCredits(pkg)}
                      disabled={!!isLoading}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <><CreditCard size={12} /> Buy</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground/50 mt-3">
              1 credit per AI message · 100 credits per agent · 50 credits per hub subscription. Payments secured by Paystack.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}

export default Billing;
