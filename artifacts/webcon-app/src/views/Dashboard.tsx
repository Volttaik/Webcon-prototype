import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Clock, MessageSquare, Brain,
  ArrowRight, TrendingUp, Flame, BookOpen, ChevronRight, Trash2, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppHeader from '@/components/layout/AppHeader';
import AgentCreatorDialog from '@/components/AgentCreatorDialog';
import AgentKnowledgeDialog from '@/components/AgentKnowledgeDialog';
import PageTransition from '@/components/PageTransition';
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
function StatCard({ icon: Icon, label, value, sub, loading, shimmerDelay = '0s' }: { icon: React.ElementType; label: string; value: string; sub?: string; loading?: boolean; shimmerDelay?: string }) {
  return (
    <div
      className="glow-border elevated-surface rounded-2xl px-4 py-3.5 flex items-start gap-3 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-elevation-lg"
      style={{ '--shimmer-delay': shimmerDelay } as React.CSSProperties}
    >
      <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5 shadow-elevation-sm">
        <Icon className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[9.5px] text-muted-foreground/75 mb-0.5 leading-none">{label}</p>
        {loading ? (
          <div className="h-4 w-10 bg-muted animate-pulse rounded" />
        ) : (
          <p className="text-base font-semibold tracking-tight leading-none">{value}</p>
        )}
        {sub && <p className="text-[9.5px] text-muted-foreground/65 mt-1 leading-none">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Agent card ─── */
function AgentCard({ agent, index, onDelete, onOpenKnowledge }: { agent: Agent; index: number; onDelete: (id: number) => void; onOpenKnowledge: (a: Agent) => void }) {
  const navigate = useNavigate();
  return (
    <div
      className="glow-border elevated-surface rounded-2xl p-5 hover:shadow-elevation-lg hover:border-foreground/20 transition-all cursor-pointer group relative hover:-translate-y-1"
      style={{ '--shimmer-delay': `${index * 0.8}s` } as React.CSSProperties}
      onClick={() => navigate(`/chat?agent=${agent.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center shadow-elevation-sm">
          <Brain className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onOpenKnowledge(agent); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Manage knowledge files"
            title="Add notes, syllabus, or PDFs"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(agent.id); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
            aria-label="Delete agent"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
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
    </div>
  );
}

/* ─── Empty agents ─── */
function EmptyAgents({ onNew }: { onNew: () => void }) {
  return (
    <div
      className="elevated-surface border-dashed rounded-2xl p-10 text-center shadow-elevation-md"
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
    </div>
  );
}

/* ─── Loading skeleton ─── */
function AgentSkeleton() {
  return (
    <div className="elevated-surface rounded-2xl p-5 animate-pulse">
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
  const [knowledgeAgent, setKnowledgeAgent] = useState<Agent | null>(null);
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

  const handleCreate = async (_agent: { name: string; subject: string; id?: number }) => {
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
    <PageTransition>
    <div className="min-h-screen app-ambient-bg">
      <AppHeader />
      <Toaster />
      <div className="ambient-orb ambient-orb-light w-80 h-80 top-24 left-1/2 -translate-x-1/2 opacity-70" />
      <div className="ambient-orb ambient-orb-dark w-44 h-44 top-44 left-1/2 translate-x-24 opacity-45" />

      <>
        {showCreator && (
          <AgentCreatorDialog onClose={() => setShowCreator(false)} onCreate={handleCreate} />
        )}
        {knowledgeAgent && (
          <AgentKnowledgeDialog
            agentId={knowledgeAgent.id}
            agentName={knowledgeAgent.name}
            onClose={() => setKnowledgeAgent(null)}
          />
        )}
      </>

      <main className="pt-12 relative z-10">
        {/* Hero */}
        <div className="px-6 py-12">
          <div className="max-w-5xl mx-auto">
            <div
              className="elevated-surface-strong rounded-[2rem] px-6 py-7 md:px-8 md:py-8 mb-4"
            >
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-2">Dashboard</p>
              <h1 className="text-2xl font-semibold tracking-tight mb-8">
                Good to see you back{firstName !== 'there' ? `, ${firstName}` : ''}.
              </h1>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={Brain}
                  label="Active agents"
                  value={stats ? `${stats.activeAgents}` : '0'}
                  sub={stats ? `of ${stats.maxAgents} available` : undefined}
                  loading={isLoading}
                  shimmerDelay="0s"
                />
                <StatCard
                  icon={MessageSquare}
                  label="Conversations"
                  value={stats ? `${stats.totalConversations}` : '0'}
                  sub="all time"
                  loading={isLoading}
                  shimmerDelay="1.2s"
                />
                <StatCard
                  icon={Flame}
                  label="Study streak"
                  value={stats ? `${stats.studyStreak} days` : '0 days'}
                  sub={stats && stats.studyStreak > 0 ? 'keep it up!' : 'start today!'}
                  loading={isLoading}
                  shimmerDelay="2.4s"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Messages this month"
                  value={stats ? `${stats.messagesThisMonth}` : '0'}
                  sub={stats ? `of ${stats.maxMessagesPerMonth} on free plan` : undefined}
                  loading={isLoading}
                  shimmerDelay="3.6s"
                />
              </div>
            </div>
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

            <>
              {isLoading ? (
                <div
                  key="skeleton"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                >
                  {[1, 2, 3, 4].map(i => <AgentSkeleton key={i} />)}
                </div>
              ) : agents.length === 0 ? (
                <EmptyAgents onNew={() => setShowCreator(true)} />
              ) : (
                <div
                  key="agents"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                >
                  <>
                    {agents.map((agent, i) => (
                      <div
                        key={agent.id}
                        className="stagger-child"
                        style={{ ['--i' as never]: i } as React.CSSProperties}
                      >
                        <AgentCard agent={agent} index={i} onDelete={handleDelete} onOpenKnowledge={setKnowledgeAgent} />
                      </div>
                    ))}
                  </>
                </div>
              )}
            </>
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

            <>
            {isLoading ? (
              <div
                key="conv-skeleton"
                  className="elevated-surface rounded-2xl overflow-hidden"
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
              </div>
            ) : conversations.length === 0 ? (
              <div
                key="conv-empty"
                className="elevated-surface border-dashed rounded-2xl p-8 text-center"
              >
                <p className="text-[12px] text-muted-foreground">No conversations yet. Start chatting with an agent!</p>
              </div>
            ) : (
              <div
                key="conv-list"
                className="divide-y divide-border/50 elevated-surface rounded-2xl overflow-hidden"
              >
              {conversations.map((conv, i) => (
                  <button
                    key={conv.id}
                    onClick={() => navigate(`/chat/${conv.id}`)}
                    style={{ ['--i' as never]: i } as React.CSSProperties}
                    className="stagger-child w-full flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/45 transition-colors text-left group"
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
                        {formatDistanceToNow(new Date(conv.updated_at ?? conv.updatedAt), { addSuffix: true })}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
            </>
          </section>

          {/* Quick start */}
          {agents.length > 0 && (
            <section>
              <h2 className="text-[13px] font-medium mb-4">Start a new session</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {agents.slice(0, 4).map((agent, i) => (
                  <button
                    key={agent.id}
                    onClick={() => navigate(`/chat?agent=${agent.id}`)}
                    className="stagger-child card-lift glow-border elevated-surface flex items-center gap-3 px-4 py-3 rounded-xl hover:border-foreground/20 hover:bg-secondary/30 text-left"
                    style={{ '--shimmer-delay': `${i * 1.1}s`, ['--i' as never]: i } as React.CSSProperties}
                  >
                    <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                      <Brain className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium truncate">{agent.name}</p>
                      <p className="text-[11px] text-muted-foreground">{agent.subject}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
    </PageTransition>
  );
}
