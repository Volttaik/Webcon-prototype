import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, FileText, Coins, Plus, Loader2, CheckCircle, AlertCircle,
  Users, Brain, TrendingUp, ChevronRight, Trash2, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppHeader from '@/components/layout/AppHeader';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

type HubFile = { id: number; title: string; content: string; wordCount: number; qualityScore: number; createdAt: string; };
type Earning = { id: number; type: string; amountNgn: number; description: string; transferStatus: string; createdAt: string; };
type Hub = { id: number; title: string; description: string | null; domain: string; subscriberCount: number; status: string; };

async function fetchDashboard(token?: string, hubId?: string) {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (hubId) params.set('hub', hubId);
  const qs = params.toString();
  const res = await fetch(`/api/learning-hubs/dashboard${qs ? `?${qs}` : ''}`);
  if (!res.ok) return null;
  return res.json() as Promise<{ hub: Hub; files: HubFile[]; earnings: Earning[]; totalEarningsNgn: number; subscriberCount: number; agentCount: number }>;
}

type Tab = 'profile' | 'documents' | 'checkout';

export default function LearningHubDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [showCreate, setShowCreate] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<{ score: number; earnings: number; message: string } | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const urlToken = searchParams.get('token') ?? undefined;
  const urlHub = searchParams.get('hub') ?? undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ['hub-dashboard', urlToken, urlHub],
    queryFn: () => fetchDashboard(urlToken, urlHub),
    retry: false,
  });

  const handleSaveDocument = async () => {
    if (!docTitle.trim() || !docContent.trim()) {
      toast.error('Title and content are required');
      return;
    }
    if (docContent.trim().split(/\s+/).length < 20) {
      toast.error('Content must be at least 20 words');
      return;
    }
    setSaving(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/learning-hubs/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle.trim(), content: docContent.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || 'Failed to save document');
        return;
      }
      setLastResult({ score: result.qualityScore, earnings: result.earningsNgn, message: result.message });
      toast.success(result.message || 'Document saved!');
      setDocTitle('');
      setDocContent('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['hub-dashboard'] });
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.hub) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4 text-center px-6">
          <BookOpen className="h-10 w-10 text-muted-foreground/30" strokeWidth={1} />
          <h2 className="text-lg font-semibold">No Learning Hub Found</h2>
          <p className="text-sm text-muted-foreground max-w-sm">You haven't created a Learning Hub yet. Apply to become a creator first.</p>
          <Button size="sm" onClick={() => window.location.href = '/learning-hub/apply'}>Apply Now</Button>
        </div>
      </div>
    );
  }

  const { hub, files, earnings, totalEarningsNgn, subscriberCount, agentCount } = data;

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', Icon: User },
    { id: 'documents', label: 'Documents', Icon: FileText },
    { id: 'checkout', label: 'Checkout', Icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster />
      <main className="pt-12">
        <div className="border-b border-border px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">Creator Dashboard</p>
                <h1 className="text-xl font-semibold tracking-tight">{hub.title}</h1>
                <p className="text-sm text-muted-foreground mt-1 capitalize">{hub.domain} · {hub.status}</p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-2xl font-semibold">₦{totalEarningsNgn.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { label: 'Subscribers', value: subscriberCount, Icon: Users },
                { label: 'Agents Created', value: agentCount, Icon: Brain },
                { label: 'Documents', value: files.length, Icon: FileText },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="border border-border rounded-xl p-4 bg-card flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-lg font-semibold leading-none">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-1 border-b border-border py-2">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors',
                  activeTab === id ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                {label}
              </button>
            ))}
          </div>

          <div className="py-6">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-5">
                  <div className="border border-border rounded-xl p-5 bg-card space-y-3">
                    <h3 className="text-sm font-medium">Hub Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Hub Name</span>
                        <span className="font-medium">{hub.title}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Domain</span>
                        <span className="font-medium capitalize">{hub.domain}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Status</span>
                        <span className={cn('font-medium capitalize', hub.status === 'active' ? 'text-green-500' : 'text-amber-500')}>{hub.status}</span>
                      </div>
                      {hub.description && (
                        <div className="py-2">
                          <span className="text-muted-foreground text-xs">Description</span>
                          <p className="mt-1 text-sm">{hub.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border border-border rounded-xl p-4 bg-amber-500/5 border-amber-500/20">
                    <h3 className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">Content Guidelines</h3>
                    <ul className="text-xs text-amber-600 dark:text-amber-500 space-y-1">
                      <li>• Only type knowledge manually — no copy-paste from external sources</li>
                      <li>• Repeated violations of content rules result in account ban</li>
                      <li>• Our team periodically reviews submissions for quality</li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {activeTab === 'documents' && (
                <motion.div key="documents" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{files.length} Documents</h3>
                    <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1.5 h-8 text-xs">
                      <Plus className="h-3.5 w-3.5" /> Create Document
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showCreate && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="border border-border rounded-xl overflow-hidden"
                      >
                        <div className="p-5 space-y-4 bg-card">
                          <h4 className="text-sm font-medium">New Document</h4>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Title</Label>
                              <Input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Document title..." />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs flex items-center justify-between">
                                <span>Content <span className="text-muted-foreground">(type manually — no paste from external sources)</span></span>
                                <span className="text-muted-foreground">{docContent.trim().split(/\s+/).filter(Boolean).length} words</span>
                              </Label>
                              <textarea
                                value={docContent}
                                onChange={e => setDocContent(e.target.value)}
                                placeholder="Type your knowledge here. This will be validated for accuracy and coherence before being added to the database..."
                                rows={10}
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                              />
                            </div>
                          </div>

                          {lastResult && (
                            <div className={cn(
                              'rounded-lg p-3 flex gap-2 text-xs',
                              lastResult.score >= 7 ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            )}>
                              {lastResult.score >= 7 ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                              <div>
                                <p className="font-medium">{lastResult.message}</p>
                                <p className="mt-0.5">Quality score: {lastResult.score}/10{lastResult.earnings > 0 ? ` · Earned ₦${lastResult.earnings.toLocaleString()}` : ''}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setShowCreate(false); setDocTitle(''); setDocContent(''); setLastResult(null); }} className="h-8 text-xs">Cancel</Button>
                            <Button size="sm" onClick={handleSaveDocument} disabled={saving} className="h-8 text-xs gap-1.5 flex-1">
                              {saving ? <><Loader2 className="h-3 w-3 animate-spin" /> Validating & Saving…</> : 'Add to Database'}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {files.length === 0 ? (
                    <div className="border border-dashed border-border rounded-xl p-12 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1} />
                      <p className="text-sm text-muted-foreground">No documents yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Create your first document to start building your hub</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map(file => (
                        <motion.div key={file.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-border rounded-xl p-4 bg-card flex items-start gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{file.wordCount} words · Quality {file.qualityScore}/10 · {new Date(file.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className={cn('text-[10px] px-2 py-0.5 rounded-full border', file.qualityScore >= 7 ? 'border-green-500/30 text-green-600' : 'border-amber-500/30 text-amber-600')}>
                            {file.qualityScore >= 7 ? 'High quality' : 'Moderate'}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'checkout' && (
                <motion.div key="checkout" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-5">
                  <div className="border border-border rounded-xl p-5 bg-card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                      <TrendingUp className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Total Earnings</p>
                      <p className="text-3xl font-semibold">₦{totalEarningsNgn.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Paid out via Paystack transfer</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-border rounded-xl p-4 bg-card text-center">
                      <p className="text-2xl font-semibold">₦{(subscriberCount * 500).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">From {subscriberCount} subscribers</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">₦500 per subscription</p>
                    </div>
                    <div className="border border-border rounded-xl p-4 bg-card text-center">
                      <p className="text-2xl font-semibold">₦{Math.max(0, totalEarningsNgn - subscriberCount * 500).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">From {files.length} documents</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">₦1,000+ per contribution</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-3">Earnings History</h3>
                    {earnings.length === 0 ? (
                      <div className="border border-dashed border-border rounded-xl p-8 text-center">
                        <Coins className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1} />
                        <p className="text-sm text-muted-foreground">No earnings yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Earn when users subscribe or you add content</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {earnings.map(e => (
                          <div key={e.id} className="border border-border rounded-xl p-3.5 bg-card flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{e.description}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(e.createdAt).toLocaleDateString()} · {e.transferStatus}</p>
                            </div>
                            <p className="text-sm font-semibold text-green-600 shrink-0 ml-3">+₦{e.amountNgn.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
