import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Brain, Plus, Loader2, Trash2,
  CheckCircle2, Copy, RefreshCw, ExternalLink,
} from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { fetchAgents, type Agent } from '@/lib/data-service';

const WHATSAPP_NUMBER = '2348061938576';

interface AgentCode {
  id: number;
  code: string;
  agentId: number;
  userId: number;
  used: boolean;
  phoneNumber: string | null;
  createdAt: string;
  usedAt: string | null;
}

export default function WhatsApp() {
  const { user } = useAuth();
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [codes, setCodes]         = useState<AgentCode[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<number | null>(null);
  const [deletingId, setDeletingId]       = useState<number | null>(null);
  const [copiedCode, setCopiedCode]       = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/agent-codes');
      if (res.ok) {
        const data = await res.json() as { codes: AgentCode[] };
        setCodes(data.codes);
      }
    } catch {
      /* silently ignore */
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setLoadingAgents(true);
    Promise.all([
      fetchAgents(user.id),
      loadCodes(),
    ])
      .then(([agentsData]) => setAgents(agentsData))
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoadingAgents(false));
  }, [user?.id, loadCodes]);

  const handleGenerate = async (agentId: number) => {
    setGeneratingFor(agentId);
    try {
      const res  = await fetch('/api/whatsapp/agent-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json() as { code?: AgentCode; error?: string };
      if (!res.ok || !data.code) {
        toast.error(data.error || 'Failed to generate code');
        return;
      }
      setCodes(prev => {
        const filtered = prev.filter(c => !(c.agentId === agentId && !c.used));
        return [...filtered, data.code!];
      });
      toast.success('Code generated');
    } catch {
      toast.error('Network error');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`/api/whatsapp/agent-codes?id=${id}`, { method: 'DELETE' });
      setCodes(prev => prev.filter(c => c.id !== id));
      toast.success('Code removed');
    } catch {
      toast.error('Failed to remove code');
    } finally {
      setDeletingId(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const getCodeForAgent = (agentId: number) =>
    codes.find(c => c.agentId === agentId && !c.used) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster />

      <main className="pt-12">
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-4xl mx-auto">
            <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-2">Connect</p>
            <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
            <p className="text-[13px] text-muted-foreground mt-2">
              Chat with your AI agents directly from WhatsApp.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

          {/* Contact card */}
          <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-5 shadow-elevation-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] font-medium">EduBridge on WhatsApp</p>
                <p className="text-[12px] text-muted-foreground">+{WHATSAPP_NUMBER}</p>
              </div>
            </div>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shadow-elevation-sm">
                <ExternalLink className="h-3.5 w-3.5" /> Open in WhatsApp
              </Button>
            </a>
          </div>

          {/* How it works */}
          <section>
            <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-4">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { step: '1', title: 'Generate a code', desc: 'Pick an agent below and generate a 12‑character activation code.' },
                { step: '2', title: 'Send the command', desc: 'Message the EduBridge number: /int YOURCODE12' },
                { step: '3', title: 'Start chatting', desc: 'Your agent is now active. Every message goes straight to it.' },
              ].map(item => (
                <div key={item.step} className="bg-card border border-border rounded-2xl p-4 shadow-elevation-sm">
                  <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">Step {item.step}</span>
                  <p className="text-[13px] font-medium mt-1">{item.title}</p>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-secondary/40 border border-border rounded-xl px-4 py-3">
              <p className="text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground">Commands: </span>
                <code className="bg-secondary px-1.5 py-0.5 rounded text-[11px]">/int YOUR_CODE</code> to activate ·{' '}
                <code className="bg-secondary px-1.5 py-0.5 rounded text-[11px]">/reset NEW_CODE</code> to switch agent ·{' '}
                Say <code className="bg-secondary px-1.5 py-0.5 rounded text-[11px]">hi</code> to see instructions
              </p>
            </div>
          </section>

          {/* Agent codes */}
          <section>
            <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-4">
              Agent Activation Codes
            </h2>

            {loadingAgents ? (
              <div className="flex items-center gap-3 text-muted-foreground text-sm py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading agents…
              </div>
            ) : agents.length === 0 ? (
              <div className="border border-dashed border-border/70 rounded-2xl p-10 text-center">
                <div className="w-10 h-10 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
                  <Brain className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.5} />
                </div>
                <p className="text-[13px] font-medium mb-1">No agents yet</p>
                <p className="text-[12px] text-muted-foreground">
                  Create an agent on the Dashboard first.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {agents.map((agent, i) => {
                    const activeCode = getCodeForAgent(agent.id);
                    const isGenerating = generatingFor === agent.id;

                    return (
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-card border border-border rounded-2xl px-5 py-4 shadow-elevation-sm flex items-center gap-4"
                      >
                        <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                          <Brain className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">{agent.name}</p>
                          <p className="text-[12px] text-muted-foreground truncate">{agent.subject}</p>
                        </div>

                        {activeCode ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1.5 bg-secondary border border-border rounded-xl px-3 py-1.5">
                              <span className="text-[13px] font-mono font-semibold tracking-wider">
                                {activeCode.code}
                              </span>
                              {activeCode.used && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              )}
                            </div>
                            <button
                              onClick={() => copyCode(activeCode.code)}
                              className="h-8 w-8 rounded-xl border border-border bg-secondary flex items-center justify-center hover:border-foreground/20 transition text-muted-foreground hover:text-foreground"
                              title="Copy code"
                            >
                              {copiedCode === activeCode.code ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleGenerate(agent.id)}
                              disabled={isGenerating}
                              className="h-8 w-8 rounded-xl border border-border bg-secondary flex items-center justify-center hover:border-foreground/20 transition text-muted-foreground hover:text-foreground disabled:opacity-40"
                              title="Regenerate code"
                            >
                              {isGenerating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(activeCode.id)}
                              disabled={deletingId === activeCode.id}
                              className="h-8 w-8 rounded-xl border border-border bg-secondary flex items-center justify-center hover:border-destructive/30 hover:text-destructive transition text-muted-foreground disabled:opacity-40"
                              title="Remove code"
                            >
                              {deletingId === activeCode.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 shrink-0 shadow-elevation-sm"
                            onClick={() => handleGenerate(agent.id)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            Generate Code
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
