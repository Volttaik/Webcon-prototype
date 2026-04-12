import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppHeader from '@/components/layout/AppHeader';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { fetchDashboardStats, type DashboardStats } from '@/lib/data-service';

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

export default function Billing() {
  const { user, creditBalance } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    const loadStats = async () => {
      setIsLoading(true);
      try {
        const data = await fetchDashboardStats(user.id);
        setStats(data);
      } catch (error) {
        console.error('[v0] Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStats();
  }, [user?.id]);

  const USAGE = [
    { 
      label: 'AI messages this month', 
      used: stats?.messagesThisMonth || 0, 
      total: stats?.maxMessagesPerMonth || 100 
    },
    { 
      label: 'Active agents', 
      used: stats?.activeAgents || 0, 
      total: stats?.maxAgents || 5 
    },
    { 
      label: 'Credit balance', 
      used: creditBalance?.balance || 0, 
      total: creditBalance?.lifetime_earned || 50,
      isCredits: true
    },
  ];

  // Calculate next reset date (first of next month)
  const nextResetDate = new Date();
  nextResetDate.setMonth(nextResetDate.getMonth() + 1);
  nextResetDate.setDate(1);
  const resetDateStr = nextResetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-12">
        {/* Header */}
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">Billing</p>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Plans & usage</h1>
              <p className="text-[13px] text-muted-foreground">Upgrade anytime to unlock more study power.</p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

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
                    <span className={cn(item.used / item.total > 0.8 && !('isCredits' in item) ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      {'isCredits' in item ? `${item.used} credits` : `${item.used} / ${item.total}`}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary border border-border overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full', item.used / item.total > 0.8 ? 'bg-foreground' : 'bg-foreground/50')}
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.used / item.total) * 100}%` }}
                      transition={{ duration: 0.7, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border">
                <p className="text-[11px] text-muted-foreground">
                  Resets on <span className="text-foreground font-medium">{resetDateStr}</span> · {(stats?.maxMessagesPerMonth || 100) - (stats?.messagesThisMonth || 0)} messages remaining this month
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
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full border font-medium',
                      plan.current
                        ? 'border-foreground/20 bg-secondary text-muted-foreground'
                        : 'border-border bg-secondary text-muted-foreground'
                    )}>
                      {plan.badge}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mt-1 mb-5">
                    <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-foreground/60 shrink-0 mt-0.5" strokeWidth={2} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {plan.current ? (
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs shadow-elevation-sm" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full h-9 text-xs shadow-elevation-sm gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      Upgrade to {plan.name} <ArrowRight className="h-3 w-3 ml-auto" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </section>

          {/* Payment method */}
          <section>
            <h2 className="text-[13px] font-medium mb-4">Payment method</h2>
            <div className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                <CreditCard className="h-4.5 w-4.5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">No payment method added</p>
                <p className="text-xs text-muted-foreground mt-0.5">Add a card to upgrade your plan at any time</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs shadow-elevation-sm shrink-0">Add card</Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
