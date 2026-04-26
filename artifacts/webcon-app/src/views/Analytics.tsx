import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Brain, TrendingUp, Flame, Clock, MessageSquare,
  BookOpen, ArrowUpRight, Target,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import AppHeader from '@/components/layout/AppHeader';
import PageTransition from '@/components/PageTransition';
import { BrainLoader } from '@/components/ui/brain-loader';
import { useAuth } from '@/lib/auth-context';
import { fetchAnalytics, type AnalyticsData } from '@/lib/data-service';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildWeeklyChart(messagesByDay: { date: string; count: number }[]) {
  const last7 = messagesByDay.slice(-7);
  return last7.map(d => ({
    day: DAY_LABELS[new Date(d.date + 'T00:00:00').getDay()],
    messages: d.count,
  }));
}

function buildMonthlyChart(messagesByDay: { date: string; count: number }[]) {
  const last28 = messagesByDay.slice(-28);
  const weeks = [];
  for (let w = 0; w < 4; w++) {
    const slice = last28.slice(w * 7, w * 7 + 7);
    const sessions = slice.reduce((sum, d) => sum + (d.count > 0 ? 1 : 0), 0);
    weeks.push({ week: `W${w + 1}`, sessions });
  }
  return weeks;
}

function StatCard({ icon: Icon, label, value, delta, loading }: {
  icon: React.ElementType; label: string; value: string; delta: string; loading?: boolean;
}) {
  return (
    <div className="border border-border rounded-2xl px-5 py-4 bg-card shadow-elevation-sm flex items-start gap-3.5">
      <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
        {loading ? (
          <div className="h-5 w-14 bg-muted animate-pulse rounded mt-1" />
        ) : (
          <p className="text-xl font-semibold tracking-tight leading-none">{value}</p>
        )}
        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
          <ArrowUpRight className="h-2.5 w-2.5 shrink-0" /> {delta}
        </p>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-elevation-md text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-muted-foreground">
          {p.name}: <span className="text-foreground font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchAnalytics()
      .then(setAnalytics)
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  const weeklyData = analytics ? buildWeeklyChart(analytics.messagesByDay) : [];
  const monthlyData = analytics ? buildMonthlyChart(analytics.messagesByDay) : [];

  const subjectBreakdown = (analytics?.topAgents ?? []).slice(0, 5).map(a => {
    const max = Math.max(...(analytics?.topAgents ?? []).map(x => x.messageCount), 1);
    return {
      subject: a.subject || a.agentName,
      agentName: a.agentName,
      sessions: a.messageCount,
      progress: Math.round((a.messageCount / max) * 100),
    };
  });

  const dynamicStats = [
    {
      icon: MessageSquare, label: 'Total messages',
      value: analytics ? analytics.totalMessages.toLocaleString() : '—',
      delta: 'all time',
    },
    {
      icon: Clock, label: 'Conversations',
      value: analytics ? analytics.totalConversations.toLocaleString() : '—',
      delta: 'all time',
    },
    {
      icon: Flame, label: 'Study streak',
      value: analytics ? `${analytics.streakDays} days` : '—',
      delta: analytics?.streakDays && analytics.streakDays > 0 ? 'Keep it up!' : 'Start today!',
    },
    {
      icon: Target, label: 'Credits used',
      value: analytics ? analytics.creditsUsed.toLocaleString() : '—',
      delta: `${analytics?.creditsBalance ?? 0} remaining`,
    },
  ];

  const hasChartData = weeklyData.some(d => d.messages > 0);

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-12">
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <div>
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">Analytics</p>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Your progress</h1>
              <p className="text-[13px] text-muted-foreground">Track how your studying is paying off over time.</p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dynamicStats.map((s) => (
              <StatCard key={s.label} {...s} loading={isLoading} />
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily messages */}
            <div className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[13px] font-medium">Messages this week</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Questions asked per day</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center">
                  <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </div>
              {isLoading ? (
                <div className="h-40 flex flex-col items-center justify-center gap-2">
                  <BrainLoader size="xs" />
                  <p className="text-[11px] text-muted-foreground/60">Loading chart…</p>
                </div>
              ) : !hasChartData ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-[12px] text-muted-foreground">No messages this week yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={weeklyData} barSize={20}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))' }} />
                    <Bar dataKey="messages" name="Messages" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Monthly sessions */}
            <div className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[13px] font-medium">Active days this month</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Days with messages per week</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </div>
              {isLoading ? (
                <div className="h-40 flex flex-col items-center justify-center gap-2">
                  <BrainLoader size="xs" />
                  <p className="text-[11px] text-muted-foreground/60">Loading chart…</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      dataKey="sessions"
                      name="Active days"
                      stroke="hsl(var(--foreground))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--foreground))', strokeWidth: 0, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Subject breakdown */}
          <section>
            <h2 className="text-[13px] font-medium mb-4">Agent breakdown</h2>
            {isLoading ? (
              <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border/50 bg-card shadow-elevation-sm">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-5 px-5 py-4">
                    <div className="w-7 h-7 rounded-lg bg-muted animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-1.5 w-full bg-muted animate-pulse rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : subjectBreakdown.length === 0 ? (
              <div className="border border-dashed border-border/70 rounded-2xl p-8 text-center">
                <p className="text-[12px] text-muted-foreground">Create agents and start chatting to see your breakdown here.</p>
              </div>
            ) : (
              <div className="border border-border rounded-2xl bg-card shadow-elevation-sm overflow-hidden divide-y divide-border/50">
                {subjectBreakdown.map((item, i) => (
                  <div
                    key={item.agentName}
                    className="flex items-center gap-5 px-5 py-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => navigate('/chat')}
                  >
                    <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                      <BookOpen className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="text-[13px] font-medium">{item.agentName}</p>
                          <p className="text-[11px] text-muted-foreground">{item.subject}</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0 ml-4">
                          {item.sessions} msgs · {item.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary border border-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-foreground"
                        />
                      </div>
                    </div>
                    <Brain className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
    </PageTransition>
  );
}
