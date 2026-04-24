import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, FileText, Coins, Plus, Loader2, CheckCircle, AlertCircle,
  Users, Brain, TrendingUp, Trash2, User, MessageCircle, Send, BadgeCheck,
  Building2, CreditCard, ChevronDown
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
type ChatMessage = { role: 'user' | 'assistant'; content: string };

const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '90267', name: 'Kuda MFBank' },
  { code: '50515', name: 'Moniepoint MFBank' },
  { code: '50211', name: 'OPay' },
  { code: '076', name: 'Polaris Bank' },
  { code: '039', name: 'Stanbic IBTC' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '033', name: 'United Bank For Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

async function fetchDashboard(token?: string, hubId?: string) {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (hubId) params.set('hub', hubId);
  const qs = params.toString();
  const res = await fetch(`/api/learning-hubs/dashboard${qs ? `?${qs}` : ''}`);
  if (!res.ok) return null;
  return res.json() as Promise<{ hub: Hub; files: HubFile[]; earnings: Earning[]; totalEarningsNgn: number; subscriberCount: number; agentCount: number }>;
}

async function fetchRecipient() {
  const res = await fetch('/api/paystack/recipient');
  if (!res.ok) return { hasRecipient: false, recipientCode: null };
  return res.json() as Promise<{ hasRecipient: boolean; recipientCode: string | null }>;
}

type Tab = 'profile' | 'documents' | 'chat' | 'checkout';

export default function LearningHubDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [showCreate, setShowCreate] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<{ score: number; earnings: number; message: string } | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Paystack state
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankStep, setBankStep] = useState<'form' | 'confirm' | 'done'>('form');

  const searchParams = new URLSearchParams(window.location.search);
  const urlToken = searchParams.get('token') ?? undefined;
  const urlHub = searchParams.get('hub') ?? undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['hub-dashboard', urlToken, urlHub],
    queryFn: () => fetchDashboard(urlToken, urlHub),
    retry: false,
  });

  const { data: recipientData, refetch: refetchRecipient } = useQuery({
    queryKey: ['paystack-recipient'],
    queryFn: fetchRecipient,
    enabled: activeTab === 'checkout',
  });

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

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

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/learning-hubs/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
    } catch {
      toast.error('Chat error. Please try again.');
      setChatMessages(prev => prev.slice(0, -1));
      setChatInput(userMsg.content);
    } finally {
      setChatLoading(false);
    }
  };

  const handleVerifyAccount = async () => {
    if (!bankCode || accountNumber.length !== 10) {
      toast.error('Select a bank and enter a 10-digit account number');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/paystack/recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankCode, accountNumber, verifyOnly: true }),
      });
      const result = await res.json().catch(() => ({} as { error?: string; accountName?: string }));
      if (!res.ok) {
        const msg = (result as { error?: string }).error;
        if (res.status === 503) {
          toast.error('Bank verification is not configured yet. The site owner must add a Paystack secret key.');
        } else {
          toast.error(msg || `Verification failed (${res.status})`);
        }
        return;
      }
      const name = (result as { accountName?: string }).accountName;
      if (!name) {
        toast.error('Paystack returned no account name. Please double-check the bank and account number.');
        return;
      }
      setVerifiedName(name);
      setBankStep('confirm');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reach verification service');
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveBank = async () => {
    setSavingBank(true);
    try {
      const res = await fetch('/api/paystack/recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankCode, accountNumber }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      toast.success(`Bank account linked: ${result.accountName}`);
      setBankStep('done');
      refetchRecipient();
    } catch {
      toast.error('Failed to save bank account');
    } finally {
      setSavingBank(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.hub) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center min-h-[60vh] flex-col gap-3 text-center px-6">
          <BookOpen className="h-8 w-8 text-muted-foreground/30" strokeWidth={1} />
          <h2 className="text-base font-semibold">No Learning Hub Found</h2>
          <p className="text-sm text-muted-foreground max-w-sm">You haven't created a Learning Hub yet.</p>
          <Button size="sm" onClick={() => window.location.href = '/learning-hub/apply'}>Apply Now</Button>
        </div>
      </div>
    );
  }

  const { hub, files, earnings, totalEarningsNgn, subscriberCount, agentCount } = data;

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', Icon: User },
    { id: 'documents', label: 'Documents', Icon: FileText },
    { id: 'chat', label: 'Chat', Icon: MessageCircle },
    { id: 'checkout', label: 'Checkout', Icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster />
      <main className="pt-12">
        {/* Header */}
        <div className="border-b border-border px-4 py-5">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">Creator Dashboard</p>
                <h1 className="text-base font-semibold tracking-tight">{hub.title}</h1>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{hub.domain} · <span className={hub.status === 'active' ? 'text-green-500' : 'text-amber-500'}>{hub.status}</span></p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-semibold">₦{totalEarningsNgn.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Total Earnings</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: 'Subscribers', value: subscriberCount, Icon: Users },
                { label: 'Agents', value: agentCount, Icon: Brain },
                { label: 'Documents', value: files.length, Icon: FileText },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="border border-border rounded-lg p-3 bg-card flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-semibold leading-none">{value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-0.5 border-b border-border pt-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs rounded-t-lg transition-colors',
                  activeTab === id ? 'bg-secondary text-foreground font-medium border-b-2 border-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3 w-3" strokeWidth={1.5} />
                {label}
              </button>
            ))}
          </div>

          <div className="py-5">
            <AnimatePresence mode="wait">

              {/* ── Profile Tab ── */}
              {activeTab === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
                  <div className="border border-border rounded-xl p-4 bg-card space-y-1">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Hub Info</h3>
                    {[
                      { label: 'Hub Name', value: hub.title },
                      { label: 'Domain', value: hub.domain },
                      { label: 'Status', value: hub.status, colored: true },
                    ].map(({ label, value, colored }) => (
                      <div key={label} className="flex justify-between py-2 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className={cn('text-xs font-medium capitalize', colored && (value === 'active' ? 'text-green-500' : 'text-amber-500'))}>{value}</span>
                      </div>
                    ))}
                    {hub.description && (
                      <div className="pt-2">
                        <p className="text-[11px] text-muted-foreground mb-1">Description</p>
                        <p className="text-xs">{hub.description}</p>
                      </div>
                    )}
                  </div>
                  <div className="border border-amber-500/20 rounded-xl p-4 bg-amber-500/5">
                    <h3 className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mb-2">Content Guidelines</h3>
                    <ul className="text-[11px] text-amber-600/80 dark:text-amber-500/80 space-y-1.5">
                      <li>• Only type knowledge manually — no copy-paste from external sources</li>
                      <li>• Repeated violations result in account ban</li>
                      <li>• Our team reviews submissions for quality</li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* ── Documents Tab ── */}
              {activeTab === 'documents' && (
                <motion.div key="documents" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{files.length} document{files.length !== 1 ? 's' : ''}</p>
                    <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1 h-7 text-xs">
                      <Plus className="h-3 w-3" /> Create
                    </Button>
                  </div>

                  <AnimatePresence>
                    {showCreate && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="border border-border rounded-xl overflow-hidden"
                      >
                        <div className="p-4 space-y-3 bg-card">
                          <h4 className="text-sm font-medium">New Document</h4>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Title</Label>
                            <Input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Document title..." className="h-8 text-sm" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs flex items-center justify-between">
                              <span>Content <span className="text-muted-foreground">(type manually — no paste)</span></span>
                              <span className="text-muted-foreground">{docContent.trim().split(/\s+/).filter(Boolean).length} words</span>
                            </Label>
                            <textarea
                              value={docContent}
                              onChange={e => setDocContent(e.target.value)}
                              placeholder="Type your knowledge here. Will be validated before being added..."
                              rows={8}
                              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed"
                            />
                          </div>

                          {lastResult && (
                            <div className={cn(
                              'rounded-lg p-3 flex gap-2 text-xs',
                              lastResult.score >= 7 ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            )}>
                              {lastResult.score >= 7 ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                              <div>
                                <p className="font-medium">{lastResult.message}</p>
                                <p className="mt-0.5 text-[11px]">Quality: {lastResult.score}/10{lastResult.earnings > 0 ? ` · Earned ₦${lastResult.earnings.toLocaleString()}` : ''}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setShowCreate(false); setDocTitle(''); setDocContent(''); setLastResult(null); }} className="h-7 text-xs">Cancel</Button>
                            <Button size="sm" onClick={handleSaveDocument} disabled={saving} className="h-7 text-xs gap-1 flex-1">
                              {saving ? <><Loader2 className="h-3 w-3 animate-spin" /> Validating…</> : 'Add to Database'}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {files.length === 0 ? (
                    <div className="border border-dashed border-border rounded-xl p-10 text-center">
                      <FileText className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1} />
                      <p className="text-sm text-muted-foreground">No documents yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Create your first document to start building your hub</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {files.map(file => (
                        <motion.div key={file.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-border rounded-xl p-3.5 bg-card flex items-start gap-3">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{file.wordCount} words · Quality {file.qualityScore}/10 · {new Date(file.createdAt).toLocaleDateString()}</p>
                          </div>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border shrink-0', file.qualityScore >= 7 ? 'border-green-500/30 text-green-600' : 'border-amber-500/30 text-amber-600')}>
                            {file.qualityScore >= 7 ? 'High' : 'Moderate'}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Chat Tab ── */}
              {activeTab === 'chat' && (
                <motion.div key="chat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex flex-col gap-3">
                  <div className="border border-border rounded-xl p-3 bg-card/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <p className="text-xs font-medium">Hub AI Thought Partner</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Chat with an AI that has read all {files.length} of your hub documents. Ask it to quiz you, find gaps, or just think through your subject.</p>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <div className="h-72 overflow-y-auto p-3 space-y-3">
                      {chatMessages.length === 0 && (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <MessageCircle className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" strokeWidth={1} />
                            <p className="text-xs text-muted-foreground">Start a conversation about your hub content</p>
                            <div className="mt-3 space-y-1.5">
                              {['Quiz me on what I know', 'What gaps do you see in my documents?', 'Summarise my hub content'].map(prompt => (
                                <button
                                  key={prompt}
                                  onClick={() => setChatInput(prompt)}
                                  className="block w-full text-left text-[11px] px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                          <div className={cn(
                            'max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                            msg.role === 'user'
                              ? 'bg-foreground text-background rounded-br-sm'
                              : 'bg-secondary text-foreground rounded-bl-sm'
                          )}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-secondary rounded-2xl rounded-bl-sm px-3 py-2">
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => (
                                <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="border-t border-border p-2.5 flex gap-2">
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                        placeholder="Ask about your hub..."
                        className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                      />
                      <button
                        onClick={handleSendChat}
                        disabled={!chatInput.trim() || chatLoading}
                        className="shrink-0 p-1.5 rounded-lg bg-foreground text-background disabled:opacity-40 transition-opacity"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Checkout Tab ── */}
              {activeTab === 'checkout' && (
                <motion.div key="checkout" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">

                  {/* Earnings summary */}
                  <div className="border border-border rounded-xl p-4 bg-card flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">Total Earnings</p>
                      <p className="text-xl font-semibold">₦{totalEarningsNgn.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground">Paid via Paystack transfer</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-border rounded-xl p-3 bg-card text-center">
                      <p className="text-base font-semibold">₦{(subscriberCount * 500).toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{subscriberCount} subscribers</p>
                      <p className="text-[10px] text-muted-foreground/60">₦500 / subscriber</p>
                    </div>
                    <div className="border border-border rounded-xl p-3 bg-card text-center">
                      <p className="text-base font-semibold">₦{Math.max(0, totalEarningsNgn - subscriberCount * 500).toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{files.length} documents</p>
                      <p className="text-[10px] text-muted-foreground/60">₦1,000+ / contribution</p>
                    </div>
                  </div>

                  {/* Bank account setup */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <p className="text-xs font-medium">Payment Account</p>
                    </div>

                    {recipientData?.hasRecipient && bankStep !== 'form' ? (
                      <div className="p-4 flex items-center gap-3">
                        <BadgeCheck className="h-5 w-5 text-green-500 shrink-0" strokeWidth={1.5} />
                        <div className="flex-1">
                          <p className="text-xs font-medium">Bank account linked</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Payouts will be sent automatically when earnings are processed</p>
                        </div>
                        <button onClick={() => setBankStep('form')} className="text-[11px] text-muted-foreground hover:text-foreground underline">Change</button>
                      </div>
                    ) : bankStep === 'confirm' ? (
                      <div className="p-4 space-y-3">
                        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                          <p className="text-[11px] text-muted-foreground mb-0.5">Account verified</p>
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400">{verifiedName}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{NIGERIAN_BANKS.find(b => b.code === bankCode)?.name} · ****{accountNumber.slice(-4)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setBankStep('form')} className="h-7 text-xs">Back</Button>
                          <Button size="sm" onClick={handleSaveBank} disabled={savingBank} className="h-7 text-xs flex-1 gap-1">
                            {savingBank ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</> : 'Confirm & Link Account'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 space-y-3">
                        <p className="text-[11px] text-muted-foreground">Add your Nigerian bank account to receive payouts from Paystack.</p>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Bank</Label>
                          <div className="relative">
                            <select
                              value={bankCode}
                              onChange={e => setBankCode(e.target.value)}
                              className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs appearance-none focus:outline-none focus:ring-1 focus:ring-ring pr-8"
                            >
                              <option value="">Select bank…</option>
                              {NIGERIAN_BANKS.map(b => (
                                <option key={b.code} value={b.code}>{b.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Account Number</Label>
                          <Input
                            value={accountNumber}
                            onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="10-digit account number"
                            className="h-8 text-sm tracking-widest"
                            maxLength={10}
                          />
                        </div>
                        <Button size="sm" onClick={handleVerifyAccount} disabled={verifying || !bankCode || accountNumber.length !== 10} className="w-full h-8 text-xs gap-1">
                          {verifying ? <><Loader2 className="h-3 w-3 animate-spin" /> Verifying…</> : <><Building2 className="h-3 w-3" /> Verify Account</>}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Earnings history */}
                  <div>
                    <p className="text-xs font-medium mb-2">Earnings History</p>
                    {earnings.length === 0 ? (
                      <div className="border border-dashed border-border rounded-xl p-8 text-center">
                        <Coins className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1} />
                        <p className="text-xs text-muted-foreground">No earnings yet</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">Earn when users subscribe or you add content</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {earnings.map(e => (
                          <div key={e.id} className="border border-border rounded-xl p-3 bg-card flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{e.description}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(e.createdAt).toLocaleDateString()} · {e.transferStatus}</p>
                            </div>
                            <p className="text-xs font-semibold text-green-600 shrink-0 ml-3">+₦{e.amountNgn.toLocaleString()}</p>
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
