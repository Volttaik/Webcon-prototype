import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays, Plus, Clock, Brain, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, Flame, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppHeader from '@/components/layout/AppHeader';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek } from 'date-fns';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SESSIONS: Record<number, { subject: string; time: string; duration: string; type: string; done: boolean }[]> = {
  0: [
    { subject: 'Biology', time: '09:00', duration: '45 min', type: 'Study session', done: true },
    { subject: 'Mathematics', time: '14:00', duration: '30 min', type: 'Practice problems', done: false },
  ],
  1: [
    { subject: 'Computer Science', time: '10:30', duration: '60 min', type: 'Coding practice', done: false },
  ],
  2: [
    { subject: 'History', time: '09:00', duration: '30 min', type: 'Essay review', done: false },
    { subject: 'Biology', time: '15:00', duration: '45 min', type: 'Quiz prep', done: false },
  ],
  3: [],
  4: [
    { subject: 'Mathematics', time: '11:00', duration: '60 min', type: 'Exam prep', done: false },
  ],
  5: [
    { subject: 'History', time: '13:00', duration: '45 min', type: 'Revision', done: false },
    { subject: 'Computer Science', time: '16:00', duration: '30 min', type: 'Project work', done: false },
  ],
  6: [],
};

const DEADLINES = [
  { title: 'Biology Lab Report', date: 'Tomorrow', subject: 'Biology', urgent: true },
  { title: 'Calculus Problem Set 4', date: 'In 3 days', subject: 'Mathematics', urgent: false },
  { title: 'History Essay Draft', date: 'In 5 days', subject: 'History', urgent: false },
  { title: 'CS Algorithms Assignment', date: 'Next week', subject: 'Computer Science', urgent: false },
];

const SUBJECT_COLORS: Record<string, string> = {
  Biology: 'border-l-2 border-foreground/40',
  Mathematics: 'border-l-2 border-foreground/20',
  History: 'border-l-2 border-muted-foreground/40',
  'Computer Science': 'border-l-2 border-foreground/60',
};

export default function Schedule() {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pt-12">
        {/* Header */}
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">Schedule</p>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Study planner</h1>
              <p className="text-[13px] text-muted-foreground">Plan sessions, track deadlines, stay consistent.</p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

          {/* Week strip */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <h2 className="text-[13px] font-medium">
                  Week of {format(weekStart, 'MMM d, yyyy')}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(w => w - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-3" onClick={() => setWeekOffset(0)}>Today</Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWeekOffset(w => w + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Day pills */}
            <div className="grid grid-cols-7 gap-1.5 mb-6">
              {DAYS.map((day, i) => {
                const date = addDays(weekStart, i);
                const hasSession = (SESSIONS[i] || []).length > 0;
                const isToday = weekOffset === 0 && i === new Date().getDay() - 1;
                return (
                  <motion.button
                    key={day}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setSelectedDay(i)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all',
                      selectedDay === i
                        ? 'bg-foreground text-background border-foreground shadow-elevation-md'
                        : isToday
                          ? 'bg-secondary border-foreground/30 text-foreground'
                          : 'bg-card border-border text-muted-foreground hover:border-foreground/20 hover:bg-secondary/40'
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-wider font-medium">{day}</span>
                    <span className="text-base font-semibold leading-none">{format(date, 'd')}</span>
                    {hasSession && (
                      <div className={cn('w-1 h-1 rounded-full', selectedDay === i ? 'bg-background/60' : 'bg-foreground/30')} />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Sessions for selected day */}
            <div className="border border-border rounded-2xl bg-card shadow-elevation-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <p className="text-[12px] font-medium text-muted-foreground">
                  {format(addDays(weekStart, selectedDay), 'EEEE, MMMM d')}
                </p>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate('/chat')}>
                  <Plus className="h-3 w-3" /> Add session
                </Button>
              </div>

              {(SESSIONS[selectedDay] || []).length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">No sessions planned</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add a study session to stay on track</p>
                  <Button variant="outline" size="sm" className="mt-4 h-8 text-xs shadow-elevation-sm" onClick={() => navigate('/chat')}>
                    Start a session
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {(SESSIONS[selectedDay] || []).map((session, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3 }}
                      className={cn(
                        'flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors cursor-pointer',
                        SUBJECT_COLORS[session.subject]
                      )}
                      onClick={() => navigate('/chat')}
                    >
                      <button className="shrink-0" onClick={e => e.stopPropagation()}>
                        {session.done
                          ? <CheckCircle2 className="h-4 w-4 text-foreground/50" strokeWidth={1.5} />
                          : <Circle className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium">{session.subject}</p>
                        <p className="text-[11px] text-muted-foreground">{session.type}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-medium">{session.time}</p>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground justify-end">
                          <Clock className="h-2.5 w-2.5" /> {session.duration}
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                        <Brain className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Deadlines */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[13px] font-medium">Upcoming deadlines</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Stay ahead of your assignments</p>
              </div>
            </div>
            <div className="space-y-2">
              {DEADLINES.map((dl, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                  className="flex items-center gap-4 px-5 py-3.5 border border-border rounded-xl bg-card shadow-elevation-sm hover:border-foreground/20 transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                    <CalendarDays className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{dl.title}</p>
                    <p className="text-[11px] text-muted-foreground">{dl.subject}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full border',
                      dl.urgent ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border bg-secondary text-muted-foreground'
                    )}>
                      {dl.date}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/chat')}>
                      Prep <Brain className="h-3 w-3 ml-1" strokeWidth={1.5} />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Study streak */}
          <section>
            <div className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center shrink-0">
                <Flame className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-0.5">7-day study streak 🔥</p>
                <p className="text-xs text-muted-foreground">You've studied every day this week. Keep it going!</p>
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className={cn('h-2 flex-1 rounded-full', i <= 6 ? 'bg-foreground/40' : 'bg-secondary border border-border')} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
