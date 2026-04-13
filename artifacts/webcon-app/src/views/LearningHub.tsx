import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Brain, Search, Coins, Plus, Loader2, Globe, Lock, Users, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppHeader from '@/components/layout/AppHeader';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/lib/auth-context';

interface LearningHub {
  id: number;
  title: string;
  description: string | null;
  domain: string;
  accessCost: number;
  agentCost: number;
  isPublic: boolean;
  fileCount: number;
  subscriberCount: number;
  status: string;
  createdAt: string;
}

async function fetchLearningHubs(): Promise<LearningHub[]> {
  const res = await fetch('/api/learning-hubs');
  if (!res.ok) return [];
  return res.json();
}

async function fetchMyHub() {
  const res = await fetch('/api/learning-hubs/apply');
  if (!res.ok) return null;
  const data = await res.json();
  return data.hub || null;
}

async function fetchMySubscriptions(): Promise<number[]> {
  try {
    const res = await fetch('/api/learning-hubs/my-subscriptions');
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

const DOMAIN_COLORS: Record<string, string> = {
  science: 'text-blue-500', engineering: 'text-purple-500', medicine: 'text-red-500',
  law: 'text-amber-500', business: 'text-green-500', education: 'text-cyan-500',
  arts: 'text-pink-500', general: 'text-muted-foreground',
};

const fadeUp = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export default function LearningHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState<number | null>(null);

  const { data: realHubs = [] } = useQuery({ queryKey: ['learning-hubs'], queryFn: fetchLearningHubs });
  const { data: myHub } = useQuery({ queryKey: ['my-hub'], queryFn: fetchMyHub });

  const allHubs = realHubs.filter(h =>
    h.title?.toLowerCase().includes(search.toLowerCase()) ||
    (h.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (h.domain ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const subscribeMutation = useMutation({
    mutationFn: async (hubId: number) => {
      const res = await fetch('/api/learning-hubs/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hubId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to subscribe');
      }
      return res.json();
    },
    onSuccess: (data) => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      queryClient.invalidateQueries({ queryKey: ['learning-hubs'] });
      toast.success(`Subscribed! ${data.creditsCharged} credits deducted.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleCreateAgentFromHub = (hub: LearningHub) => {
    navigate(`/dashboard?hub=${hub.id}&hubCost=${hub.agentCost}`);
  };

  const handleSubscribe = async (hub: LearningHub) => {
    setActingId(hub.id);
    try {
      await subscribeMutation.mutateAsync(hub.id);
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster />
      <main className="pt-12">
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">Learning Hub</p>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">Knowledge Hubs</h1>
              <p className="text-sm text-muted-foreground mb-6">Subscribe to specialized hubs and create powerful AI agents from expert knowledge.</p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hubs…" className="pl-9 h-9 text-sm" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border rounded-full px-3 py-1.5">
                  <Coins className="h-3 w-3" /><span>{user?.creditBalance ?? 0} credits</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
          {myHub ? (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[13px] font-medium">Your Hub</h2>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => navigate('/learning-hub/dashboard')}>
                  Dashboard <Brain className="h-3 w-3" />
                </Button>
              </div>
              <div className="border border-green-500/30 rounded-2xl p-5 bg-green-500/5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-green-500" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{myHub.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{myHub.domain} · {myHub.status}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-green-600 border border-green-500/30 rounded-full px-2 py-0.5">
                    <Check className="h-2.5 w-2.5" /> Active
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section>
              <div className="border border-dashed border-border rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium mb-1">Become a Hub Creator</h3>
                  <p className="text-xs text-muted-foreground">Share your knowledge, earn ₦500 per subscriber + ₦1,000+ per document</p>
                </div>
                <Button size="sm" onClick={() => navigate('/learning-hub/apply')} className="gap-1.5 shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Create Hub
                </Button>
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[13px] font-medium">Available Hubs</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Subscribe for 50 credits · Create an agent for 200 credits</p>
              </div>
            </div>

            {allHubs.length === 0 ? (
              <div className="border border-border rounded-2xl p-12 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">No hubs found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term or check back later</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allHubs.map((hub, i) => (
                  <motion.div
                    key={hub.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm hover:shadow-elevation-md hover:border-foreground/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center">
                        <BookOpen className={cn('h-4 w-4', DOMAIN_COLORS[hub.domain] || 'text-muted-foreground')} strokeWidth={1.5} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hub.subscriberCount > 0 && (
                          <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                            <Users className="h-2.5 w-2.5" /> {hub.subscriberCount}
                          </span>
                        )}
                        {hub.isPublic ? (
                          <span className="text-[10px] flex items-center gap-1 text-muted-foreground border border-border rounded-full px-2 py-0.5">
                            <Globe className="h-2.5 w-2.5" /> Public
                          </span>
                        ) : (
                          <span className="text-[10px] flex items-center gap-1 text-muted-foreground border border-border rounded-full px-2 py-0.5">
                            <Lock className="h-2.5 w-2.5" /> Private
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[13px] font-medium mb-1">{hub.title}</p>
                    {hub.description && (
                      <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">{hub.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4">
                      <span className="capitalize">{hub.domain}</span>
                      <span>·</span>
                      <span>{hub.fileCount ?? 0} documents</span>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-[11px] flex-1 gap-1.5"
                        onClick={() => handleSubscribe(hub)}
                        disabled={actingId === hub.id}
                      >
                        {actingId === hub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Coins className="h-3 w-3" />}
                        Subscribe · 50 cr
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-[11px] flex-1 gap-1.5"
                        onClick={() => handleCreateAgentFromHub(hub)}
                      >
                        <Brain className="h-3 w-3" /> Agent · 200 cr
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[13px] font-medium mb-4">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { step: '01', title: 'Subscribe to a hub', desc: 'Pay 50 credits to unlock a hub\'s specialized knowledge for your agents.' },
                { step: '02', title: 'Create a hub agent', desc: 'Build an AI agent powered by the hub\'s content for 200 credits.' },
                { step: '03', title: 'Chat with depth', desc: 'Your agent reads from the hub database and gives expert, up-to-date answers.' },
              ].map(item => (
                <div key={item.step} className="border border-border rounded-2xl p-5 bg-card">
                  <p className="text-[10px] text-muted-foreground/40 font-medium mb-2">{item.step}</p>
                  <p className="text-[13px] font-medium mb-1">{item.title}</p>
                  <p className="text-[12px] text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
