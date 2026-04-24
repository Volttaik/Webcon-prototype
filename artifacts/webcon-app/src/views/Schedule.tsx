import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays, Plus, Clock, Brain, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, Flame, Trash2, Sparkles, X, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppHeader from '@/components/layout/AppHeader';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek, isSameDay, isToday, isPast } from 'date-fns';
import { fetchAgents, type Agent } from '@/lib/data-service';
import { toast } from 'sonner';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SESSION_TYPES = [
  { id: 'study',    label: 'Study session' },
  { id: 'practice', label: 'Practice problems' },
  { id: 'review',   label: 'Review / revision' },
  { id: 'exam_prep',label: 'Exam prep' },
  { id: 'project',  label: 'Project work' },
  { id: 'reading',  label: 'Reading' },
];

interface ScheduleSession {
  id: number;
  title: string;
  agentId: number | null;
  agentName: string | null;
  subject: string | null;
  date: string;
  duration: number;
  type: string;
  completed: boolean;
  notes: string | null;
}

const SUBJECT_TINT = (subject: string | null): string => {
  if (!subject) return 'border-l-2 border-foreground/20';
  const len = subject.length;
  const variants = [
    'border-l-2 border-foreground/60',
    'border-l-2 border-foreground/40',
    'border-l-2 border-foreground/25',
    'border-l-2 border-muted-foreground/40',
  ];
  return variants[len % variants.length];
};

export default function Schedule() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const { data: sessions = [], isLoading } = useQuery<ScheduleSession[]>({
    queryKey: ['schedule'],
    queryFn: async () => {
      const res = await fetch('/api/schedule');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(),
  });

  const sessionsByDay = useMemo(() => {
    const map: Record<number, ScheduleSession[]> = {};
    weekDates.forEach((d, idx) => {
      map[idx] = sessions
        .filter((s) => isSameDay(new Date(s.date), d))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    return map;
  }, [sessions, weekDates]);

  const upcomingSuggested = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => s.agentId !== null && new Date(s.date) >= now && !s.completed)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 4);
  }, [sessions]);

  const streak = useMemo(() => {
    const completed = sessions
      .filter((s) => s.completed)
      .map((s) => new Date(s.date))
      .sort((a, b) => b.getTime() - a.getTime());
    if (completed.length === 0) return 0;
    let count = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      const day = new Date(cursor);
      day.setDate(cursor.getDate() - i);
      const has = completed.some((d) => isSameDay(d, day));
      if (has) count++;
      else if (i > 0) break;
    }
    return count;
  }, [sessions]);

  const totalThisWeek = sessions.filter((s) =>
    weekDates.some((d) => isSameDay(new Date(s.date), d))
  ).length;
  const completedThisWeek = sessions.filter((s) =>
    s.completed && weekDates.some((d) => isSameDay(new Date(s.date), d))
  ).length;

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await fetch(`/api/schedule/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error('Update failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule'] }),
    onError: () => toast.error('Could not update session'),
  });

  const deleteSession = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/schedule/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      toast.success('Session removed');
    },
    onError: () => toast.error('Could not remove session'),
  });

  const today = weekDates[selectedDay];

  return (
    <div className="min-h-screen bg-background relative">
      <AppHeader />
      <main className="container mx-auto px-3 sm:px-6 pt-16 pb-8 max-w-6xl">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-[11px] text-muted-foreground mb-2 shadow-elevation-sm">
                <CalendarDays className="h-3 w-3" strokeWidth={1.5} />
                Schedule
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Your study week</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Plan sessions, track progress, and let your agents suggest study times.
              </p>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className="h-9 text-xs gap-1.5 shadow-elevation-md"
            >
              <Plus className="h-3.5 w-3.5" /> Add session
            </Button>
          </div>
        </motion.div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          <StatCard icon={Flame} label="Day streak" value={streak} hint={streak > 0 ? 'Keep it going' : 'Start today'} />
          <StatCard icon={CheckCircle2} label="Done this week" value={completedThisWeek} hint={`of ${totalThisWeek} planned`} />
          <StatCard icon={Brain} label="Agents" value={agents.length} hint="active" />
        </div>

        {/* Week strip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="mb-5">
          <div className="bg-card border border-border rounded-2xl shadow-elevation-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <p className="text-xs font-medium">{format(weekStart, 'MMMM yyyy')}</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                  <span className="text-[10px] font-medium">Today</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7">
              {weekDates.map((date, idx) => {
                const count = sessionsByDay[idx]?.length ?? 0;
                const completed = sessionsByDay[idx]?.filter((s) => s.completed).length ?? 0;
                const selected = idx === selectedDay;
                const isCurrent = isToday(date);
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(idx)}
                    className={cn(
                      'flex flex-col items-center py-3 transition-colors text-center border-r border-border last:border-r-0',
                      selected ? 'bg-foreground text-background' : 'hover:bg-secondary',
                      isCurrent && !selected && 'bg-secondary/40'
                    )}
                  >
                    <span className={cn('text-[10px] font-medium uppercase tracking-wide', selected ? 'text-background/70' : 'text-muted-foreground')}>
                      {DAYS[idx]}
                    </span>
                    <span className="text-base font-semibold mt-0.5">{format(date, 'd')}</span>
                    <span className={cn('text-[10px] mt-1', selected ? 'text-background/70' : 'text-muted-foreground')}>
                      {count > 0 ? `${completed}/${count}` : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          {/* Day sessions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">
                {isToday(today) ? 'Today' : format(today, 'EEEE, MMM d')}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {sessionsByDay[selectedDay]?.length ?? 0} session(s)
              </span>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessionsByDay[selectedDay]?.length === 0 ? (
              <div className="border border-dashed border-border rounded-2xl p-10 text-center">
                <CalendarDays className="h-7 w-7 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1.2} />
                <p className="text-sm font-medium">Nothing scheduled</p>
                <p className="text-[12px] text-muted-foreground mt-1 mb-4">Plan a session to lock in your study time.</p>
                <Button onClick={() => setDialogOpen(true)} variant="outline" className="h-8 text-xs gap-1.5">
                  <Plus className="h-3 w-3" /> Add a session
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {sessionsByDay[selectedDay].map((s, idx) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    delay={idx * 0.04}
                    onToggle={() => toggleComplete.mutate({ id: s.id, completed: !s.completed })}
                    onDelete={() => deleteSession.mutate(s.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar — agent suggestions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> Suggested by agents
              </h2>
            </div>
            {upcomingSuggested.length === 0 ? (
              <div className="border border-dashed border-border rounded-2xl p-5 text-center">
                <Brain className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1.2} />
                <p className="text-[12px] text-muted-foreground">
                  Ask an agent to plan your week — suggested sessions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingSuggested.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      const dayIdx = weekDates.findIndex((d) => isSameDay(new Date(s.date), d));
                      if (dayIdx >= 0) setSelectedDay(dayIdx);
                    }}
                    className="w-full text-left bg-card border border-border rounded-xl p-3 shadow-elevation-sm hover:shadow-elevation-md transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-4 h-4 rounded bg-foreground text-background flex items-center justify-center text-[8px] font-bold">
                        {s.agentName?.[0] ?? 'A'}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">{s.agentName}</span>
                    </div>
                    <p className="text-[12.5px] font-medium leading-snug truncate">{s.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10.5px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{format(new Date(s.date), 'EEE · h:mm a')}</span>
                      <span>· {s.duration}m</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 border border-border rounded-2xl p-4 bg-secondary/30">
              <p className="text-[12px] font-medium mb-1">Tip</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tell your agent: <em>"Plan a study block tomorrow at 4pm for 60 minutes"</em> and it'll appear on your schedule automatically.
              </p>
              <Button
                variant="ghost" size="sm"
                className="h-7 text-[11px] mt-2 -ml-2"
                onClick={() => navigate('/agents')}
              >
                Open agents →
              </Button>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {dialogOpen && (
          <AddSessionDialog
            agents={agents}
            defaultDate={today}
            onClose={() => setDialogOpen(false)}
            onCreated={() => {
              setDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['schedule'] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: number; hint: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 shadow-elevation-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[10.5px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

function SessionRow({
  session, onToggle, onDelete, delay,
}: {
  session: ScheduleSession;
  onToggle: () => void;
  onDelete: () => void;
  delay: number;
}) {
  const date = new Date(session.date);
  const time = format(date, 'h:mm a');
  const isOverdue = !session.completed && isPast(date) && !isToday(date);
  const typeLabel = SESSION_TYPES.find((t) => t.id === session.type)?.label ?? session.type;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className={cn(
        'group bg-card border border-border rounded-2xl p-3.5 shadow-elevation-sm hover:shadow-elevation-md transition-all flex items-start gap-3',
        SUBJECT_TINT(session.subject),
        session.completed && 'opacity-60'
      )}
    >
      <button
        onClick={onToggle}
        className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
        aria-label={session.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {session.completed ? (
          <CheckCircle2 className="h-4 w-4 text-foreground" strokeWidth={1.6} />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" strokeWidth={1.4} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn('text-[13px] font-medium leading-snug', session.completed && 'line-through')}>
            {session.title}
          </p>
          {session.agentId && (
            <span className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded-full bg-foreground/5 border border-foreground/10 text-muted-foreground">
              <Sparkles className="h-2 w-2" strokeWidth={1.7} />
              {session.agentName}
            </span>
          )}
          {isOverdue && (
            <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-foreground/10 text-foreground font-medium">
              Overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          <span>{time}</span>
          <span>·</span>
          <span>{session.duration} min</span>
          {session.subject && <><span>·</span><span>{session.subject}</span></>}
          <span>·</span>
          <span>{typeLabel}</span>
        </div>
        {session.notes && (
          <p className="text-[11px] text-muted-foreground/80 mt-1.5 line-clamp-2">{session.notes}</p>
        )}
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground"
        aria-label="Delete session"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </motion.div>
  );
}

function AddSessionDialog({
  agents, defaultDate, onClose, onCreated,
}: {
  agents: Agent[];
  defaultDate: Date;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [agentId, setAgentId] = useState<string>('none');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(format(defaultDate, 'yyyy-MM-dd'));
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(45);
  const [type, setType] = useState('study');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('Title is required');
    setSubmitting(true);
    try {
      const dateTime = new Date(`${date}T${time}:00`);
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          agentId: agentId === 'none' ? undefined : Number(agentId),
          subject: subject.trim() || undefined,
          date: dateTime.toISOString(),
          duration,
          type,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || 'Could not create session');
        return;
      }
      toast.success('Session added');
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="bg-background border border-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-elevation-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">New study session</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Review chapter 4" className="h-9 text-sm" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Duration (min)</Label>
              <Input type="number" min={5} max={480} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-9 text-sm w-full rounded-md border border-input bg-background px-3"
              >
                {SESSION_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Agent (optional)</Label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="h-9 text-sm w-full rounded-md border border-input bg-background px-3"
            >
              <option value="none">No agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} · {a.subject}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Subject (optional)</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Biology" className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What do you want to focus on?"
              rows={3}
              className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-secondary/30">
          <Button variant="ghost" onClick={onClose} className="h-9 text-xs">Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="h-9 text-xs gap-1.5">
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Create session
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
