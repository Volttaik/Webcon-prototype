import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart2, Brain, TrendingUp, Flame, Clock, MessageSquare,
  BookOpen, ArrowUpRight, Target,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/lib/auth-context';
import { fetchDashboardStats, fetchAgents, type Agent, type DashboardStats } from '@/lib/data-service';

const WEEKLY_DATA = [
  { day: 'Mon', messages: 12, minutes: 24 },
  { day: 'Tue', messages: 8,  minutes: 16 },
  { day: 'Wed', messages: 18, minutes: 36 },
  { day: 'Thu', messages: 5,  minutes: 10 },
  { day: 'Fri', messages: 22, minutes: 44 },
  { day: 'Sat', messages: 14, minutes: 28 },
  { day: 'Sun', messages: 9,  minutes: 18 },
];

const MONTHLY_DATA = [
  { week: 'W1', sessions: 8 },
  { week: 'W2', sessions: 12 },
  { week: 'W3', sessions: 7 },
  { week: 'W4', sessions: 15 },
];

const SUBJECT_BREAKDOWN = [
  { subject: 'Biology', sessions: 12, progress: 72 },
  { subject: 'Mathematics', sessions: 8, progress: 58 },
  { subject: 'History', sessions: 5, progress: 41 },
  { subject: 'Computer Science', sessions: 19, progress: 85 },
];

const STATS = [
  { icon: MessageSquare, label: 'Total messages', value: '288', delta: '+12% this week' },
  { icon: Clock, label: 'Study time', value: '41 hrs', delta: '+3 hrs this week' },
  { icon: Flame, label: 'Current streak', value: '7 days', delta: 'Personal best!' },
  { icon: Target, label: 'Topics mastered', value: '14', delta: '2 new this week' },
];

function StatCard({ icon: Icon, label, value, delta }: { icon: React.ElementType; label: string; value: string; delta: string }) {
  return (
    <div className="border border-border rounded-2xl px-5 py-4 bg-card shadow-elevation-sm flex items-start gap-3.5">
      <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
        <p className="text-xl font-semibold tracking-tight leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
          <ArrowUpRight className="h-2.5 w-2.5" /> {delta}
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
        <p key={p.dataKey} className="text-muted-foreground">{p.name}: <span className="text-foreground font-medium">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [statsData, agentsData] = await Promise.all([
          fetchDashboardStats(user.id),
          fetchAgents(user.id),
        ]);
        setStats(statsData);
        setAgents(agentsData);
      } catch (error) {
        console.error('[v0] Error loading analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user?.id]);

  // Generate subject breakdown from agents data
  const subjectBreakdown = agents.slice(0, 4).map(agent => ({
    subject: agent.subject,
    sessions: agent.conversation_count || 0,
    progress: Math.min(100, (agent.conversation_count || 0) * 5), // Rough progress estimate
  }));

  // Dynamic stats based on real data
  const dynamicStats = [
    { icon: MessageSquare, label: 'Total messages', value: stats?.messagesThisMonth?.toString() || '0', delta: 'this month' },
    { icon: Clock, label: 'Conversations', value: stats?.totalConversations?.toString() || '0', delta: 'all time' },
    { icon: Flame, label: 'Current streak', value: `${stats?.studyStreak || 0} days`, delta: stats?.studyStreak && stats.studyStreak > 0 ? 'Keep it up!' : 'Start today!' },
    { icon: Target, label: 'Active agents', value: stats?.activeAgents?.toString() || '0', delta: `of ${stats?.maxAgents || 5} available` },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-12">
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">Analytics</p>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Your progress</h1>
              <p className="text-[13px] text-muted-foreground">Track how your studying is paying off over time.</p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {dynamicStats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.06, duration: 0.35 }}>
                <StatCard {...s} />
              </motion.div>
            ))}
          </motion.div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily messages */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
              className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[13px] font-medium">Messages this week</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Questions asked per day</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center">
                  <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={WEEKLY_DATA} barSize={20}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))' }} />
                  <Bar dataKey="messages" name="Messages" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Monthly sessions */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.4 }}
              className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[13px] font-medium">Sessions this month</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Study sessions per week</p>
                </div>
                <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={MONTHLY_DATA}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Line dataKey="sessions" name="Sessions" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ fill: 'hsl(var(--foreground))', strokeWidth: 0, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Subject breakdown */}
          <section>
            <h2 className="text-[13px] font-medium mb-4">Subject breakdown</h2>
            {subjectBreakdown.length === 0 ? (
              <div className="border border-dashed border-border/70 rounded-2xl p-8 text-center">
                <p className="text-[12px] text-muted-foreground">Create agents to see your subject breakdown here.</p>
              </div>
            ) : (
              <div className="border border-border rounded-2xl bg-card shadow-elevation-sm overflow-hidden divide-y divide-border/50">
                {subjectBreakdown.map((item, i) => (
                  <motion.div
                    key={item.subject}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.06, duration: 0.35 }}
                    className="flex items-center gap-5 px-5 py-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => navigate('/chat')}
                  >
                    <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                      <BookOpen className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[13px] font-medium">{item.subject}</p>
                        <span className="text-[11px] text-muted-foreground">{item.sessions} sessions · {item.progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary border border-border overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-foreground"
                          initial={{ width: 0 }}
                          animate={{ width: `${item.progress}%` }}
                          transition={{ duration: 0.7, delay: 0.3 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                    <Brain className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Insights */}
          <section>
            <h2 className="text-[13px] font-medium mb-4">AI insights</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: TrendingUp, text: 'You study best between 9–11am. Consider scheduling harder topics in that window.', label: 'Peak time' },
                { icon: Brain, text: 'Biology is your strongest subject. You answer questions 40% faster than last month.', label: 'Strength' },
                { icon: Target, text: 'History needs more attention — you\'ve only had 5 sessions vs. 12–19 for other subjects.', label: 'Focus area' },
              ].map((insight, i) => (
                <motion.div
                  key={insight.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.07, duration: 0.4 }}
                  className="border border-border rounded-2xl p-4 bg-card shadow-elevation-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <insight.icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{insight.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.text}</p>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
