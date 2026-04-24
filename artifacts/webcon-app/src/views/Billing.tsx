import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import AppHeader from '@/components/layout/AppHeader';
import { Toaster } from '@/components/ui/sonner';
import {
  Crown, Zap, Star, Check, Loader2, CreditCard,
  Gift, ArrowRight, BadgeCheck, AlertCircle,
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

export function Billing() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPkg,  setLoadingPkg]  = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const handleBuyPlan = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res  = await fetch('/api/plans/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, returnTo: '/billing' }),
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
        body: JSON.stringify({ packageId: pkg.id, returnTo: '/billing' }),
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
