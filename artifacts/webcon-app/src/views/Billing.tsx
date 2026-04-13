import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, CreditCard, ArrowRight, Coins, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppHeader from '@/components/layout/AppHeader';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { fetchDashboardStats, type DashboardStats } from '@/lib/data-service';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    badge: 'Current plan',
    current: true,
    features: [
      '5 AI agents',
      '100 messages/month',
      'WhatsApp & Telegram',
      'Basic analytics',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    badge: 'Most popular',
    current: false,
    features: [
      'Unlimited agents',
      '1,000 messages/month',
      'WhatsApp & Telegram',
      'Full analytics',
      'Priority support',
      'Study schedule planner',
      'Exam prep mode',
    ],
  },
  {
    name: 'Team',
    price: '$30',
    period: '/month',
    badge: 'Study groups',
    current: false,
    features: [
      'Everything in Pro',
      'Up to 5 students',
      '5,000 messages/month',
      'Shared agents',
      'Group analytics',
      'Admin controls',
      'Onboarding call',
    ],
  },
];

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 100,
    amountNgn: 500,
    desc: 'Perfect for trying out agent creation',
    popular: false,
  },
  {
    id: 'student',
    name: 'Student Pack',
    credits: 300,
    amountNgn: 1200,
    desc: 'Great for regular students',
    popular: true,
  },
  {
    id: 'scholar',
    name: 'Scholar Pack',
    credits: 700,
    amountNgn: 2500,
    desc: 'For power users with multiple agents',
    popular: false,
  },
  {
    id: 'champion',
    name: 'Champion Pack',
    credits: 2000,
    amountNgn: 6000,
    desc: 'Best value — never run out',
    popular: false,
  },
];

export default function Billing() {
  const { user, creditBalance, refreshProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [buyingPackage, setBuyingPackage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadStats = async () => {
      setIsLoading(true);
      try {
        const data = await fetchDashboardStats(user.id);
        setStats(data);
      } catch (error) {
        console.error('[billing] Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [user?.id]);

  // Handle Paystack callback on return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference') || params.get('trxref');
    const status = params.get('payment');

    if (ref && status === 'success') {
      // Verify the payment
      fetch(`/api/credits/verify?reference=${ref}`)
        .then(r => r.json())
        .then(data => {
          if (data.credits) {
            toast.success(`Payment verified! ${data.credits} credits added to your account.`);
            refreshProfile();
          }
        })
        .catch(() => toast.error('Could not verify payment. Contact support if credits were not added.'));

      // Clean the URL
      window.history.replaceState({}, '', '/billing');
    }
  }, [refreshProfile]);

  const handleBuyCredits = async (packageId: string) => {
    setBuyingPackage(packageId);
    try {
      const res = await fetch('/api/credits/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to initiate payment');
        return;
      }

      // Redirect to Paystack checkout
      window.location.href = data.authorizationUrl;
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setBuyingPackage(null);
    }
  };

  const USAGE = [
    {
      label: 'AI messages this month',
      used: stats?.messagesThisMonth || 0,
      total: stats?.maxMessagesPerMonth || 100,
    },
    {
      label: 'Active agents',
      used: stats?.activeAgents || 0,
      total: stats?.maxAgents || 5,
    },
    {
      label: 'Credit balance',
      used: creditBalance?.balance || 0,
      total: Math.max(creditBalance?.lifetime_earned || 50, 50),
      isCredits: true,
    },
  ];

  // Calculate next reset date (first of next month)
  const nextResetDate = new Date();
  nextResetDate.setMonth(nextResetDate.getMonth() + 1);
  nextResetDate.setDate(1);
  const resetDateStr = nextResetDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster />
      <main className="pt-12">
        {/* Header */}
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">
                Billing
              </p>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Plans & credits</h1>
              <p className="text-[13px] text-muted-foreground">
                Manage your subscription and top up credits to create agents.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">

          {/* Credit balance highlight */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04, duration: 0.4 }}
            className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm flex items-center gap-5"
          >
            <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center shrink-0">
              <Coins className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Your credit balance</p>
              <p className="text-3xl font-semibold tracking-tight leading-none">
                {creditBalance?.balance ?? user?.creditBalance ?? 0}
                <span className="text-base font-normal text-muted-foreground ml-1.5">credits</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Each agent creation costs 100 credits · Learning Hub agents cost 700
              </p>
            </div>
            <div className="shrink-0 hidden sm:block">
              <p className="text-xs text-muted-foreground text-right mb-1">Lifetime earned</p>
              <p className="text-sm font-medium text-right">{creditBalance?.lifetime_earned ?? 0}</p>
            </div>
          </motion.div>

          {/* Current usage */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.4 }}
          >
            <h2 className="text-[13px] font-medium mb-4">Current usage — Free plan</h2>
            <div className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm space-y-4">
              {USAGE.map((item, i) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span
                      className={cn(
                        item.used / item.total > 0.8 && !item.isCredits
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item.isCredits ? `${item.used} credits` : `${item.used} / ${item.total}`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary border border-border overflow-hidden">
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        item.used / item.total > 0.8 ? 'bg-foreground' : 'bg-foreground/50'
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((item.used / item.total) * 100, 100)}%` }}
                      transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border">
                <p className="text-[11px] text-muted-foreground">
                  Resets on{' '}
                  <span className="text-foreground font-medium">{resetDateStr}</span> ·{' '}
                  {(stats?.maxMessagesPerMonth || 100) - (stats?.messagesThisMonth || 0)} messages
                  remaining this month
                </p>
              </div>
            </div>
          </motion.section>

          {/* Plans */}
          <section>
            <h2 className="text-[13px] font-medium mb-4">Choose your plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3, transition: { duration: 0.18 } }}
                  className={cn(
                    'border rounded-2xl p-6 bg-card shadow-elevation-sm hover:shadow-elevation-md transition-shadow flex flex-col',
                    plan.current ? 'border-foreground/30' : 'border-border'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full border font-medium',
                        plan.current
                          ? 'border-foreground/20 bg-secondary text-muted-foreground'
                          : 'border-border bg-secondary text-muted-foreground'
                      )}
                    >
                      {plan.badge}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 mt-1 mb-5">
                    <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check
                          className="h-3.5 w-3.5 text-foreground/60 shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {plan.current ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9 text-xs shadow-elevation-sm"
                      disabled
                    >
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full h-9 text-xs shadow-elevation-sm gap-1.5"
                      onClick={() => toast.info('Plan upgrades coming soon! Top up credits below.')}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Upgrade to {plan.name}{' '}
                      <ArrowRight className="h-3 w-3 ml-auto" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </section>

          {/* Buy Credits */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[13px] font-medium">Top up credits</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Powered by Paystack
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              Credits are used to create agents (100 cr) and subscribe to Learning Hub agents (700 cr).
              Pay securely in Nigerian Naira via card, bank transfer, or USSD.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CREDIT_PACKAGES.map((pkg, i) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3, transition: { duration: 0.18 } }}
                  className={cn(
                    'border rounded-2xl p-5 bg-card shadow-elevation-sm hover:shadow-elevation-md transition-shadow flex flex-col relative',
                    pkg.popular ? 'border-foreground/30' : 'border-border'
                  )}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2.5 left-4 text-[10px] px-2 py-0.5 rounded-full bg-foreground text-background font-medium">
                      Popular
                    </span>
                  )}
                  <div className="mb-3">
                    <p className="text-sm font-semibold">{pkg.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{pkg.desc}</p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-semibold tracking-tight">{pkg.credits}</span>
                    <span className="text-sm text-muted-foreground">credits</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-5">
                    ₦{pkg.amountNgn.toLocaleString()}
                  </p>

                  <Button
                    size="sm"
                    variant={pkg.popular ? 'default' : 'outline'}
                    className="w-full h-8 text-xs mt-auto gap-1.5 shadow-elevation-sm"
                    onClick={() => handleBuyCredits(pkg.id)}
                    disabled={buyingPackage !== null}
                  >
                    {buyingPackage === pkg.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Redirecting…
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-3.5 w-3.5" /> Buy now
                      </>
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Payment info */}
          <section>
            <div className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium mb-0.5">Secure payments via Paystack</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All transactions are processed securely by Paystack. We accept Visa, Mastercard,
                  bank transfers, and USSD. Credits are added instantly after payment verification.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
