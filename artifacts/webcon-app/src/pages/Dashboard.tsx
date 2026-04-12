import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Clock, MessageSquare, Brain,
  ArrowRight, TrendingUp, Flame, BookOpen, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppHeader from '@/components/layout/AppHeader';
import AgentCreatorDialog from '@/components/AgentCreatorDialog';
import { useAuth } from '@/lib/auth-context';
import {
  fetchAgents,
  fetchConversations,
  fetchDashboardStats,
  deleteAgent,
  type Agent,
  type Conversation,
  type DashboardStats,
} from '@/lib/data-service';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

/* ─── Stat card ─── */
function StatCard({ icon: Icon, label, value, sub, loading }: { icon: React.ElementType; label: string; value: string; sub?: string; loading?: boolean }) {
  return (
    <div className="border border-border rounded-2xl px-5 py-4 bg-card shadow-elevation-sm flex items-start gap-3.5">
      <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
        {loading ? (
          <div className="h-6 w-12 bg-muted animate-pulse rounded" />
        ) : (
          <p className="text-xl font-semibold tracking-tight leading-none">{value}</p>
        )}
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Agent card ─── */
function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const navigate = useNavigate();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: index * 0.04, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(`/chat?agent=${agent.id}`)}
      className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm hover:shadow-elevation-md hover:border-foreground/20 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center shadow-elevation-sm">
          <Brain className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>

      <p className="text-[13px] font-medium mb-0.5">{agent.name}</p>
      <p className="text-[12px] text-muted-foreground/70 mb-4">{agent.subject}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          <span>{agent.conversation_count || 0} chats</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{agent.last_active ? formatDistanceToNow(new Date(agent.last_active), { addSuffix: true }) : 'Never'}</span>
        </div>
      </div>

      {agent.connected_platforms && agent.connected_platforms.length > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/60">
          {agent.connected_platforms.map(p => (
            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground capitalize">{p}</span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Empty agents ─── */
function EmptyAgents({ onNew }: { onNew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border border-dashed border-border/70 rounded-2xl p-10 text-center"
    >
      <div className="w-10 h-10 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-3">
        <Brain className="h-4.5 w-4.5 text-muted-foreground/50" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] font-medium mb-1">No agents yet</p>
      <p className="text-[12px] text-muted-foreground mb-5 max-w-xs mx-auto leading-relaxed">
        Create a course agent for each subject you&apos;re studying.
      </p>
      <Button size="sm" className="h-8 text-xs gap-1.5 shadow-elevation-sm" onClick={onNew}>
        <Plus className="h-3.5 w-3.5" /> Create first agent
      </Button>
    </motion.div>
  );
}

/* ─── Loading skeleton ─── */
function AgentSkeleton() {
  return (
    <div className="border border-border rounded-2xl p-5 bg-card animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl bg-muted" />
      </div>
      <div className="h-4 w-24 bg-muted rounded mb-2" />
      <div className="h-3 w-16 bg-muted rounded mb-4" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [showCreator, setShowCreator] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [agentsData, conversationsData, statsData] = await Promise.all([
          fetchAgents(user.id),
          fetchConversations(user.id, 5),
          fetchDashboardStats(user.id),
        ]);
        setAgents(agentsData);
        setConversations(conversationsData);
        setStats(statsData);
      } catch (error) {
        console.error('[v0] Error loading dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  const handleCreate = async ({ name, subject, id: agentId }: { name: string; subject: string; id?: number }) => {
    if (!user?.id) return;
    // AgentCreatorDialog already created the agent; just refresh the list
    try {
      const agentsData = await fetchAgents(user.id);
      setAgents(agentsData);
    } catch {
      toast.error('Failed to refresh agents');
    }
  };

  const handleDelete = async (id: number) => {
    const success = await deleteAgent(id);
    if (success) {
      setAgents(prev => prev.filter(a => a.id !== id));
      toast.success('Agent deleted');
    } else {
      toast.error('Failed to delete agent');
    }
  };

  const firstName = profile?.first_name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster />

      <AnimatePresence>
        {showCreator && (
          <AgentCreatorDialog onClose={() => setShowCreator(false)} onCreate={handleCreate} />
        )}
      </AnimatePresence>

      <main className="pt-12">
        {/* Hero */}
        <div className="border-b border-border px-6 py-12">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-2">Dashboard</p>
              <h1 className="text-2xl font-semibold tracking-tight mb-8">
                Good to see you back{firstName !== 'there' ? `, ${firstName}` : ''}.
              </h1>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              <StatCard
                icon={Brain}
                label="Active agents"
                value={stats ? `${stats.activeAgents}` : '0'}
                sub={stats ? `of ${stats.maxAgents} available` : undefined}
                loading={isLoading}
              />
              <StatCard
                icon={MessageSquare}
                label="Conversations"
                value={stats ? `${stats.totalConversations}` : '0'}
                sub="all time"
                loading={isLoading}
              />
              <StatCard
                icon={Flame}
                label="Study streak"
                value={stats ? `${stats.studyStreak} days` : '0 days'}
                sub={stats && stats.studyStreak > 0 ? 'keep it up!' : 'start today!'}
                loading={isLoading}
              />
              <StatCard
                icon={TrendingUp}
                label="Messages this month"
                value={stats ? `${stats.messagesThisMonth}` : '0'}
                sub={stats ? `of ${stats.maxMessagesPerMonth} on free plan` : undefined}
                loading={isLoading}
              />
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">

          {/* Agents */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[13px] font-medium">Your agents</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Each agent knows your syllabus and remembers every session</p>
              </div>
              <Button
                variant="outline" size="sm"
                className="h-8 text-xs gap-1.5 shadow-elevation-sm"
                onClick={() => setShowCreator(true)}
              >
                <Plus className="h-3.5 w-3.5" /> New agent
              </Button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {isLoading ? (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                >
                  {[1, 2, 3, 4].map(i => <AgentSkeleton key={i} />)}
                </motion.div>
              ) : agents.length === 0 ? (
                <EmptyAgents onNew={() => setShowCreator(true)} />
              ) : (
                <motion.div
                  key="agents"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                >
                  <AnimatePresence>
                    {agents.map((agent, i) => (
                      <AgentCard key={agent.id} agent={agent} index={i} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Recent conversations */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[13px] font-medium">Recent conversations</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Pick up where you left off</p>
              </div>
              <Button
                variant="ghost" size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                onClick={() => navigate('/chat')}
              >
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
            {isLoading ? (
              <motion.div
                key="conv-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="border border-border rounded-2xl bg-card shadow-elevation-sm overflow-hidden"
              >
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/50 last:border-0 animate-pulse">
                    <div className="w-7 h-7 rounded-lg bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-muted rounded mb-2" />
                      <div className="h-3 w-48 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : conversations.length === 0 ? (
              <motion.div
                key="conv-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border border-dashed border-border/70 rounded-2xl p-8 text-center"
              >
                <p className="text-[12px] text-muted-foreground">No conversations yet. Start chatting with an agent!</p>
              </motion.div>
            ) : (
              <motion.div
                key="conv-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="divide-y divide-border/50 border border-border rounded-2xl bg-card shadow-elevation-sm overflow-hidden"
              >
              {conversations.map((conv, i) => (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/30 transition-colors text-left group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                      <BookOpen className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{conv.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {conv.agent?.name || 'General'} · {conv.preview || 'No preview'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
            </AnimatePresence>
          </section>

          {/* Quick start */}
          {agents.length > 0 && (
            <section>
              <h2 className="text-[13px] font-medium mb-4">Start a new session</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {agents.slice(0, 4).map((agent, i) => (
                  <motion.button
                    key={agent.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => navigate(`/chat?agent=${agent.id}`)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-foreground/20 hover:bg-secondary/30 transition-all text-left shadow-elevation-sm"
                  >
                    <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                      <Brain className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium truncate">{agent.name}</p>
                      <p className="text-[11px] text-muted-foreground">{agent.subject}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                  </motion.button>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
