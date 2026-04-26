import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check, X, Loader2, Sparkles, Zap, AlertTriangle, Crown, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useQueryClient } from '@tanstack/react-query';

type Status = 'verifying' | 'success' | 'already' | 'cancelled' | 'error';

interface CreditsResult {
  kind: 'credits';
  credits: number;
  newBalance: number;
  packageName?: string;
  amountNgn?: number;
}

interface PlanResult {
  kind: 'plan';
  planId: string;
  planName: string;
  expiresAt?: string;
  bonusCredits?: number;
}

type Result = CreditsResult | PlanResult;

const PACKAGE_NAMES: Record<string, { name: string; amountNgn: number; credits: number }> = {
  trial:    { name: 'Trial Pack',    amountNgn: 100,   credits: 10 },
  starter:  { name: 'Starter Pack',  amountNgn: 1000,  credits: 100 },
  standard: { name: 'Standard Pack', amountNgn: 4500,  credits: 500 },
  pro_pack: { name: 'Power Pack',    amountNgn: 10000, credits: 1200 },
  mega:     { name: 'Mega Pack',     amountNgn: 22000, credits: 3000 },
  student:  { name: 'Student Pack',  amountNgn: 1200,  credits: 300 },
  scholar:  { name: 'Scholar Pack',  amountNgn: 2500,  credits: 700 },
  champion: { name: 'Champion Pack', amountNgn: 6000,  credits: 2000 },
};

const PLAN_NAMES: Record<string, string> = {
  pro: 'Pro Plan',
  creator: 'Creator Plan',
};

function inferPackageFromCredits(credits: number): { name: string; amountNgn: number } | undefined {
  return Object.values(PACKAGE_NAMES).find(p => p.credits === credits);
}

function safeReturnTo(raw: string | null): string {
  if (!raw) return '/billing';
  // Only allow same-origin absolute paths
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/billing';
  return raw;
}

export default function PaymentCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const reference = params.get('reference');
  const paymentParam = params.get('payment'); // "cancelled" or "success"
  const returnTo = safeReturnTo(params.get('returnTo'));

  const [status, setStatus] = useState<Status>('verifying');
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (paymentParam === 'cancelled') {
      setStatus('cancelled');
      return;
    }

    if (!reference) {
      setStatus('error');
      setErrorMsg('No payment reference found in the URL.');
      return;
    }

    const isPlan = reference.startsWith('PLAN-');
    const endpoint = isPlan
      ? `/api/plans/verify?reference=${encodeURIComponent(reference)}`
      : `/api/credits/verify?reference=${encodeURIComponent(reference)}`;

    (async () => {
      try {
        const res = await fetch(endpoint);
        const data = await res.json() as {
          success?: boolean;
          alreadyProcessed?: boolean;
          error?: string;
          // credits
          credits?: number;
          balance?: number;
          // plan
          planId?: string;
          expiresAt?: string;
          bonusCredits?: number;
        };

        if (!res.ok) {
          setStatus('error');
          setErrorMsg(data.error || 'We could not verify your payment.');
          return;
        }

        if (isPlan) {
          if (!data.planId) {
            setStatus('error');
            setErrorMsg(data.error || 'Plan upgrade could not be confirmed.');
            return;
          }
          setResult({
            kind: 'plan',
            planId: data.planId,
            planName: PLAN_NAMES[data.planId] ?? data.planId,
            expiresAt: data.expiresAt,
            bonusCredits: Number(data.bonusCredits) || 0,
          });
        } else {
          // Defensive: server may serialize numeric values as strings if
          // upstream metadata was stringified by Paystack.
          const creditsNum = Number(data.credits);
          const balanceNum = Number(data.balance);
          if (!Number.isFinite(creditsNum) || creditsNum <= 0) {
            setStatus('error');
            setErrorMsg(data.error || 'Credit purchase could not be confirmed.');
            return;
          }
          const guess = inferPackageFromCredits(creditsNum);
          setResult({
            kind: 'credits',
            credits: creditsNum,
            newBalance: Number.isFinite(balanceNum) ? balanceNum : 0,
            packageName: guess?.name ?? `${creditsNum} Credits`,
            amountNgn: guess?.amountNgn,
          });
        }

        setStatus(data.alreadyProcessed ? 'already' : 'success');
        await refreshProfile();
        queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      } catch (err) {
        console.error('[payment-callback] verify failed:', err);
        setStatus('error');
        setErrorMsg('Network error verifying your payment. If you were charged, contact support — we will reconcile it.');
      }
    })();
  }, [reference, paymentParam, refreshProfile, queryClient]);

  const handleClose = () => navigate(returnTo, { replace: true });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <>
        {status === 'verifying' && <VerifyingCard key="verifying" />}
        {status === 'cancelled' && (
          <CancelledCard key="cancelled" onClose={handleClose} returnTo={returnTo} />
        )}
        {status === 'error' && (
          <ErrorCard key="error" message={errorMsg} onClose={handleClose} />
        )}
        {(status === 'success' || status === 'already') && result?.kind === 'credits' && (
          <CreditsSuccessCard
            key="credits-success"
            data={result}
            already={status === 'already'}
            onClose={handleClose}
          />
        )}
        {(status === 'success' || status === 'already') && result?.kind === 'plan' && (
          <PlanSuccessCard
            key="plan-success"
            data={result}
            already={status === 'already'}
            onClose={handleClose}
          />
        )}
      </>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Cards                                                             */
/* ---------------------------------------------------------------- */

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full max-w-sm bg-card border border-border rounded-3xl p-8 shadow-elevation-xl text-center"
    >
      {children}
    </div>
  );
}

function VerifyingCard() {
  return (
    <CardShell>
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 rounded-full bg-secondary border border-border flex items-center justify-center">
          <Loader2 className="h-7 w-7 text-foreground animate-spin" strokeWidth={2} />
        </div>
      </div>
      <h2 className="text-xl font-semibold tracking-tight mb-1">Verifying your payment</h2>
      <p className="text-[13px] text-muted-foreground">
        Hold on — we’re confirming everything with Paystack.
      </p>
    </CardShell>
  );
}

function CreditsSuccessCard({
  data, already, onClose,
}: {
  data: CreditsResult;
  already: boolean;
  onClose: () => void;
}) {
  return (
    <CardShell>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex justify-center mb-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Check className="h-7 w-7 text-green-500" strokeWidth={2.5} />
          </div>
          <div
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"
          >
            <Sparkles className="h-3 w-3 text-blue-500" />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight mb-1">
        {already ? 'Already confirmed' : 'Payment successful!'}
      </h2>
      <p className="text-[13px] text-muted-foreground mb-6">
        {already
          ? `Your ${data.packageName} purchase was already credited.`
          : `Your ${data.packageName} purchase has been confirmed.`}
      </p>

      <div className="bg-secondary/40 border border-border rounded-2xl px-5 py-4 mb-5 space-y-3">
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
        className="w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5"
      >
        Continue <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </CardShell>
  );
}

function PlanSuccessCard({
  data, already, onClose,
}: {
  data: PlanResult;
  already: boolean;
  onClose: () => void;
}) {
  const renew = data.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <CardShell>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex justify-center mb-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Crown className="h-7 w-7 text-violet-400" strokeWidth={2} />
          </div>
          <div
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"
          >
            <Sparkles className="h-3 w-3 text-blue-500" />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight mb-1">
        {already ? 'Subscription already active' : `Welcome to ${data.planName}`}
      </h2>
      <p className="text-[13px] text-muted-foreground mb-6">
        {already
          ? 'Your plan is already active — nothing more to do.'
          : 'Your subscription is active. Everything below is unlocked on your account.'}
      </p>

      <div className="bg-secondary/40 border border-border rounded-2xl px-5 py-4 mb-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">Plan</span>
          <span className="text-[15px] font-bold">{data.planName}</span>
        </div>
        {renew && (
          <>
            <div className="border-t border-border/60" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Renews on</span>
              <span className="text-[15px] font-medium">{renew}</span>
            </div>
          </>
        )}
        {data.bonusCredits && data.bonusCredits > 0 && (
          <>
            <div className="border-t border-border/60" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">Bonus credits</span>
              <span className="text-[15px] font-bold text-green-500">
                +{data.bonusCredits.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/60 mb-5">
        A welcome email with the receipt has been sent to your inbox.
      </p>

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5"
      >
        Continue <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </CardShell>
  );
}

function CancelledCard({ onClose, returnTo }: { onClose: () => void; returnTo: string }) {
  return (
    <CardShell>
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <X className="h-7 w-7 text-amber-500" strokeWidth={2.5} />
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight mb-1">Payment cancelled</h2>
      <p className="text-[13px] text-muted-foreground mb-6">
        No charge was made. You can try again whenever you’re ready.
      </p>

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5"
      >
        Back to {returnTo === '/settings' ? 'settings' : 'billing'} <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </CardShell>
  );
}

function ErrorCard({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <CardShell>
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" strokeWidth={2} />
        </div>
      </div>

      <h2 className="text-xl font-semibold tracking-tight mb-1">Payment not confirmed</h2>
      <p className="text-[13px] text-muted-foreground mb-6">
        {message}
      </p>

      <button
        onClick={onClose}
        className="w-full py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5"
      >
        Go back <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </CardShell>
  );
}
