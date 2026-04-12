import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Brain, ArrowRight, Search, Clock, Coins, Plus, Loader2, Globe, Lock,
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
  createdAt: string;
}

async function fetchLearningHubs(): Promise<LearningHub[]> {
  const res = await fetch('/api/learning-hubs');
  if (!res.ok) return [];
  return res.json();
}

const DOMAIN_COLORS: Record<string, string> = {
  education: 'text-blue-500',
  research: 'text-purple-500',
  business: 'text-green-500',
  general: 'text-muted-foreground',
};


const fadeUp = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export default function LearningHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [accessingId, setAccessingId] = useState<number | null>(null);

  const { data: realHubs = [] } = useQuery({
    queryKey: ['learning-hubs'],
    queryFn: fetchLearningHubs,
  });

  const allHubs = realHubs.filter(h =>
    h.title?.toLowerCase().includes(search.toLowerCase()) ||
    (h.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (h.domain ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const accessMutation = useMutation({
    mutationFn: async (hubId: number) => {
      const res = await fetch(`/api/learning-hubs/${hubId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'access' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to access hub');
      }
      return res.json();
    },
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      toast.success('Hub accessed!');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleCreateAgentFromHub = (hub: Partial<LearningHub>) => {
    if ((hub.id ?? 0) < 0) {
      toast.info('Sample hubs are coming soon. Create a real hub first!');
      return;
    }
    navigate(`/dashboard?hub=${hub.id}&hubCost=${hub.agentCost}`);
  };

  const handleAccessHub = async (hub: Partial<LearningHub>) => {
    if ((hub.id ?? 0) < 0) {
      toast.info('This is a sample hub. Real hubs with content coming soon!');
      return;
    }
    setAccessingId(hub.id!);
    try {
      await accessMutation.mutateAsync(hub.id!);
    } finally {
      setAccessingId(null);
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
              <h1 className="text-2xl font-semibold tracking-tight mb-2">Knowledge hubs</h1>
              <p className="text-sm text-muted-foreground mb-6">Structured knowledge collections to power your agents with deep domain expertise.</p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search hubs by subject or domain…"
                    className="pl-9 h-9 text-sm shadow-elevation-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border rounded-full px-3 py-1.5">
                  <Coins className="h-3 w-3" />
                  <span>{user?.creditBalance ?? 0} credits</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[13px] font-medium">Available hubs</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Access hubs to give your agents deep domain knowledge</p>
              </div>
              <Button
                size="sm" variant="outline"
                className="h-8 text-xs gap-1.5 shadow-elevation-sm"
                onClick={() => toast.info('Hub creation coming soon!')}
              >
                <Plus className="h-3.5 w-3.5" /> Create hub
              </Button>
            </div>

            {allHubs.length === 0 ? (
              <div className="border border-border rounded-2xl p-12 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">No hubs found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allHubs.map((hub, i) => (
                  <motion.div
                    key={hub.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm hover:shadow-elevation-md hover:border-foreground/20 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center shadow-elevation-sm">
                        <BookOpen className={cn('h-4 w-4', DOMAIN_COLORS[hub.domain ?? 'general'] || 'text-muted-foreground')} strokeWidth={1.5} />
                      </div>
                      <div className="flex items-center gap-1.5">
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
                      <span>{hub.fileCount ?? 0} files</span>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-[11px] flex-1 gap-1.5 shadow-elevation-sm"
                        onClick={() => handleAccessHub(hub)}
                        disabled={accessingId === hub.id}
                      >
                        {accessingId === hub.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Coins className="h-3 w-3" />
                        )}
                        Access · {hub.accessCost} cr
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-[11px] flex-1 gap-1.5 shadow-elevation-sm"
                        onClick={() => handleCreateAgentFromHub(hub)}
                      >
                        <Brain className="h-3 w-3" />
                        Create agent · {hub.agentCost} cr
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[13px] font-medium mb-4">How learning hubs work</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { step: '01', title: 'Access a hub', desc: 'Pay credits to unlock a structured knowledge collection in your domain.' },
                { step: '02', title: 'Create an agent', desc: 'Build a specialized AI agent powered by the hub\'s deep knowledge.' },
                { step: '03', title: 'Chat with depth', desc: 'Your agent draws from the hub for more accurate, domain-specific answers.' },
              ].map(item => (
                <div key={item.step} className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm">
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
