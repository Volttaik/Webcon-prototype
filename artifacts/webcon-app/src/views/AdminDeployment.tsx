import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, Database, ExternalLink, LockKeyhole, RefreshCw, ServerCog, ShieldCheck } from 'lucide-react';
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

const ADMIN_AUTH_STORAGE_KEY = 'webcon-admin-auth';

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
  const [authRequired, setAuthRequired] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async (authOverride?: string) => {
    setLoading(true);
    setError(null);
    try {
      const auth = authOverride ?? window.sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
      if (!auth) {
        setAuthRequired(true);
        setStatus(null);
        return;
      }

      const response = await fetch('/api/admin/deployment', {
        cache: 'no-store',
        headers: { Authorization: `Basic ${auth}` },
      });
      const data = await response.json();

      if (response.status === 401) {
        window.sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
        setAuthRequired(true);
        setStatus(null);
        setError('Invalid admin username or password.');
        return;
      }

      if (!response.ok) throw new Error(data.error || 'Could not load deployment status');
      setStatus(data as DeploymentStatus);
      setAuthRequired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load deployment status');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const auth = btoa(`${username}:${password}`);
    window.sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, auth);
    await loadStatus(auth);
  };

  const handleSignOut = () => {
    window.sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    setStatus(null);
    setAuthRequired(true);
    setPassword('');
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const percent = useMemo(() => {
    if (!status?.requiredCount) return 0;
    return Math.round((status.readyCount / status.requiredCount) * 100);
  }, [status]);

  if (authRequired) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader />
        <main className="pt-24 px-4 pb-12 max-w-md mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Card className="bg-card/70">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/50">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <CardTitle>Admin access</CardTitle>
                <CardDescription>This page is hidden from the normal website. Enter the admin credentials to view deployment readiness.</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Access denied</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="admin-username" className="text-sm font-medium">Username</label>
                    <input
                      id="admin-username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="admin-password" className="text-sm font-medium">Password</label>
                    <input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                      autoComplete="current-password"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !username || !password}>
                    {loading ? 'Checking…' : 'Open admin page'}
                  </Button>
                </form>
                <p className="mt-4 text-xs text-muted-foreground">Manual path: /admin/deployment</p>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

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
            <div className="flex gap-2">
              <Button onClick={() => loadStatus()} disabled={loading} variant="outline">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleSignOut} variant="ghost">Lock</Button>
            </div>
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
