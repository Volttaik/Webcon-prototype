import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Plus, Calendar, Brain, MoreHorizontal,
  CheckCircle2, Circle, Clock, BookOpen, ArrowRight, Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AppHeader from '@/components/layout/AppHeader';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

type Status = 'todo' | 'in-progress' | 'done';

interface Project {
  id: string;
  title: string;
  subject: string;
  deadline: string;
  tasks: { label: string; done: boolean }[];
  status: Status;
  priority: 'high' | 'medium' | 'low';
}

const INITIAL_PROJECTS: Project[] = [];

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  'todo':        { label: 'To Do',       color: 'text-muted-foreground', bg: 'bg-secondary border-border' },
  'in-progress': { label: 'In Progress', color: 'text-foreground',       bg: 'bg-secondary border-foreground/30' },
  'done':        { label: 'Done',        color: 'text-muted-foreground', bg: 'bg-secondary border-border' },
};

const PRIORITY_CONFIG = {
  high:   { label: 'High',   dot: 'bg-destructive' },
  medium: { label: 'Medium', dot: 'bg-foreground/50' },
  low:    { label: 'Low',    dot: 'bg-muted-foreground/40' },
};

function ProjectCard({ project, onDelete, onToggleTask }: {
  project: Project;
  onDelete: () => void;
  onToggleTask: (ti: number) => void;
}) {
  const navigate = useNavigate();
  const done = project.tasks.filter(t => t.done).length;
  const pct = Math.round((done / project.tasks.length) * 100);
  const st = STATUS_CONFIG[project.status];
  const pr = PRIORITY_CONFIG[project.priority];

  return (
    <div
      className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm hover:shadow-elevation-md hover:border-foreground/20 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', pr.dot)} />
            <span className="text-[10px] text-muted-foreground">{project.subject}</span>
          </div>
          <p className="text-[13px] font-medium leading-snug">{project.title}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground shrink-0" onClick={e => e.stopPropagation()}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 shadow-elevation-lg border-border text-sm">
            <DropdownMenuItem onClick={() => navigate('/chat')}>Ask agent</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status + deadline */}
      <div className="flex items-center gap-2 mb-4">
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', st.bg, st.color)}>{st.label}</span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
          <Calendar className="h-2.5 w-2.5" /> {project.deadline}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>{done}/{project.tasks.length} tasks</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary border border-border overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground/60"
          />
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-1.5 mb-4">
        {project.tasks.slice(0, 3).map((task, ti) => (
          <button
            key={ti}
            onClick={() => onToggleTask(ti)}
            className="w-full flex items-center gap-2 text-left group/task"
          >
            {task.done
              ? <CheckCircle2 className="h-3.5 w-3.5 text-foreground/50 shrink-0" strokeWidth={1.5} />
              : <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
            }
            <span className={cn('text-[12px] leading-tight', task.done ? 'line-through text-muted-foreground' : 'text-foreground/80')}>
              {task.label}
            </span>
          </button>
        ))}
        {project.tasks.length > 3 && (
          <p className="text-[11px] text-muted-foreground pl-5">+{project.tasks.length - 3} more tasks</p>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-border/60 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground flex-1" onClick={() => navigate('/chat')}>
          <Brain className="h-3 w-3" strokeWidth={1.5} /> Ask agent
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <BookOpen className="h-3 w-3" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

const FILTER_TABS: { label: string; status: Status | 'all' }[] = [
  { label: 'All', status: 'all' },
  { label: 'To Do', status: 'todo' },
  { label: 'In Progress', status: 'in-progress' },
  { label: 'Done', status: 'done' },
];

export default function Projects() {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [filter, setFilter] = useState<Status | 'all'>('all');

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  const toggleTask = (pid: string, ti: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== pid) return p;
      const tasks = p.tasks.map((t, i) => i === ti ? { ...t, done: !t.done } : t);
      const done = tasks.filter(t => t.done).length;
      const status: Status = done === 0 ? 'todo' : done === tasks.length ? 'done' : 'in-progress';
      return { ...p, tasks, status };
    }));
  };

  const deleteProject = (pid: string) => {
    setProjects(prev => prev.filter(p => p.id !== pid));
    toast('Project removed');
  };

  const inProgress = projects.filter(p => p.status === 'in-progress').length;
  const done = projects.filter(p => p.status === 'done').length;
  const high = projects.filter(p => p.priority === 'high').length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster />
      <main className="pt-12">
        {/* Header */}
        <div className="border-b border-border px-6 py-10">
          <div className="max-w-5xl mx-auto">
            <div>
              <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">Projects</p>
              <h1 className="text-2xl font-semibold tracking-tight mb-6">Your assignments</h1>

              {/* Quick stats */}
              <div className="flex flex-wrap items-center gap-4">
                {[
                  { icon: FolderKanban, label: 'Total', val: projects.length },
                  { icon: Clock,        label: 'In Progress', val: inProgress },
                  { icon: CheckCircle2, label: 'Done', val: done },
                  { icon: Flame,        label: 'High priority', val: high },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-card shadow-elevation-sm">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-sm font-semibold">{val}</span>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 shadow-elevation-sm ml-auto" onClick={() => toast('Add project — coming soon!')}>
                  <Plus className="h-3.5 w-3.5" /> New project
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 mb-6">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.status}
                onClick={() => setFilter(tab.status)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs transition-all font-medium',
                  filter === tab.status
                    ? 'bg-secondary border border-border text-foreground shadow-elevation-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] opacity-60">
                  {tab.status === 'all' ? projects.length : projects.filter(p => p.status === tab.status).length}
                </span>
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <>
              {filtered.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={() => deleteProject(project.id)}
                  onToggleTask={ti => toggleTask(project.id, ti)}
                />
              ))}
            </>
            {filtered.length === 0 && (
              <div
                className="col-span-full border border-dashed border-border/70 rounded-2xl p-10 text-center"
              >
                <FolderKanban className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">No projects here</p>
              </div>
            )}
          </div>

          {/* Quick nav */}
          <div
            className="mt-10 border border-border rounded-2xl p-5 bg-card shadow-elevation-sm flex items-center gap-4"
          >
            <Brain className="h-5 w-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-sm font-medium">Need help with an assignment?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your agents can help you plan, research, and write — any time.</p>
            </div>
            <Button size="sm" className="h-8 text-xs gap-1.5 shadow-elevation-sm shrink-0" onClick={() => window.location.href = '/chat'}>
              Open chat <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
