import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, Database, ExternalLink, RefreshCw, ServerCog, ShieldCheck } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DeploymentCheck {
  key: string;
  label: string;
  configured: boolean;
  healthy: boolean;
  required: boolean;
  detail: string;
}

interface DeploymentStatus {
  target: string;
  databaseProvider: string;
  ready: boolean;
  readyCount: number;
  requiredCount: number;
  checkedAt: string;
  checks: DeploymentCheck[];
}

function StatusPill({ healthy, configured }: { healthy: boolean; configured: boolean }) {
  const label = healthy ? 'Ready' : configured ? 'Needs attention' : 'Missing';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${healthy ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-amber-500/30 bg-amber-500/10 text-amber-500'}`}>
      {label}
    </span>
  );
}

function CheckIcon({ healthy, configured }: { healthy: boolean; configured: boolean }) {
  if (healthy) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (configured) return <Clock className="h-4 w-4 text-amber-500" />;
  return <AlertCircle className="h-4 w-4 text-amber-500" />;
}

export default function AdminDeployment() {
  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/deployment', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load deployment status');
      setStatus(data as DeploymentStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load deployment status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const percent = useMemo(() => {
    if (!status?.requiredCount) return 0;
    return Math.round((status.readyCount / status.requiredCount) * 100);
  }, [status]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="pt-20 px-4 pb-12 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground mb-4">
                <ServerCog className="h-3.5 w-3.5" />
                Vercel deployment admin
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Production readiness</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Check the services Vercel needs for WebCon: Supabase Postgres, agents, credits, payments, email verification, and public URLs.
              </p>
            </div>
            <Button onClick={loadStatus} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Status unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card className="bg-card/60">
              <CardHeader className="pb-3">
                <CardDescription>Required checks</CardDescription>
                <CardTitle className="text-3xl">{status ? `${status.readyCount}/${status.requiredCount}` : '—'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-foreground transition-all" style={{ width: `${percent}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardHeader className="pb-3">
                <CardDescription>Database provider</CardDescription>
                <CardTitle className="flex items-center gap-2 text-xl"><Database className="h-5 w-5" /> Supabase</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Postgres connection through Vercel environment variables.</CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardHeader className="pb-3">
                <CardDescription>Overall status</CardDescription>
                <CardTitle className="flex items-center gap-2 text-xl">
                  {status?.ready ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertCircle className="h-5 w-5 text-amber-500" />}
                  {status?.ready ? 'Ready for Vercel' : 'Action needed'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {status?.checkedAt ? `Last checked ${new Date(status.checkedAt).toLocaleString()}` : 'Checking configuration…'}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle>Deployment checks</CardTitle>
                <CardDescription>These checks only expose whether values exist, never the secret values themselves.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading && !status ? (
                  <div className="text-sm text-muted-foreground">Loading deployment status…</div>
                ) : (
                  status?.checks.map((check) => (
                    <div key={check.key} className="flex flex-col gap-3 rounded-xl border border-border bg-background/50 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3">
                        <div className="mt-0.5"><CheckIcon healthy={check.healthy} configured={check.configured} /></div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium">{check.label}</h3>
                            {check.required && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Required</span>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{check.detail}</p>
                        </div>
                      </div>
                      <StatusPill healthy={check.healthy} configured={check.configured} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="bg-card/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Vercel env vars</CardTitle>
                  <CardDescription>Add these in Vercel Project Settings → Environment Variables.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm font-mono text-muted-foreground">
                    <p>SUPABASE_DATABASE_URL</p>
                    <p>NEXT_PUBLIC_SITE_URL</p>
                    <p>GROQ_API_KEY</p>
                    <p>PAYSTACK_SECRET_KEY</p>
                    <p>GMAIL_USER</p>
                    <p>GMAIL_APP_PASSWORD</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/60">
                <CardHeader>
                  <CardTitle>Database setup</CardTitle>
                  <CardDescription>Run the Supabase SQL schema once before using auth, agents, credits, or workspace features.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={() => window.open('https://supabase.com/dashboard', '_blank')}>
                    Open Supabase
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <p className="mt-3 text-xs text-muted-foreground">Schema file: lib/db/supabase-schema.sql</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
