import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, FileText, Layers, Lightbulb, ArrowDown, Globe, Code, CalendarDays, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SlashCommand {
  key: string;
  label: string;
  description: string;
  Icon: React.ElementType;
  /** Replaces the slash command with this prefix. Cursor is positioned at end. */
  prompt: string;
  /** If true, fires send immediately (no further typing needed). */
  autoSend?: boolean;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { key: 'quiz',       label: '/quiz',       description: 'Quiz me on a topic',                  Icon: GraduationCap, prompt: 'Quiz me on: ' },
  { key: 'flashcards', label: '/flashcards', description: 'Generate Q&A flashcards',             Icon: Layers,        prompt: 'Create 10 flashcards (Q&A format) on: ' },
  { key: 'explain',    label: '/explain',    description: 'Explain in simple terms',             Icon: Lightbulb,     prompt: 'Explain in simple terms: ' },
  { key: 'deeper',     label: '/deeper',     description: 'Go deeper on the last reply',         Icon: ArrowDown,     prompt: 'Go deeper on what you just explained — give more detail and examples.', autoSend: true },
  { key: 'cite',       label: '/cite',       description: 'Search the web and cite sources',     Icon: Globe,         prompt: 'Search the web and cite reliable sources for: ' },
  { key: 'summarize',  label: '/summarize',  description: 'Summarise this chat as a study note', Icon: FileText,      prompt: "Summarise everything we've discussed into a clear study note and save it to my workspace.", autoSend: true },
  { key: 'plan',       label: '/plan',       description: 'Create a study plan',                 Icon: CalendarDays,  prompt: 'Create a study plan for: ' },
  { key: 'code',       label: '/code',       description: 'Write working code',                  Icon: Code,          prompt: 'Write working, well-commented code for: ' },
  { key: 'concise',    label: '/concise',    description: 'Re-answer in 3 sentences',            Icon: Sparkles,      prompt: 'Re-answer your last reply in at most 3 sentences.', autoSend: true },
];

interface Props {
  query: string;
  selectedIndex: number;
  onSelect: (cmd: SlashCommand) => void;
  onHover: (i: number) => void;
}

export function filterCommands(query: string) {
  const q = query.toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(c =>
    c.key.toLowerCase().includes(q) ||
    c.description.toLowerCase().includes(q)
  );
}

export default function SlashCommandsMenu({ query, selectedIndex, onSelect, onHover }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const filtered = filterCommands(query);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (filtered.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.97 }}
        transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-elevation-xl overflow-hidden"
      >
        <div className="px-3 py-1.5 border-b border-border/60">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
            Slash commands · ↑↓ to navigate · Enter to use · Esc to close
          </p>
        </div>
        <div ref={listRef} className="max-h-60 overflow-y-auto py-1">
          {filtered.map((cmd, i) => {
            const Icon = cmd.Icon;
            const isSel = i === selectedIndex;
            return (
              <button
                key={cmd.key}
                data-idx={i}
                onClick={() => onSelect(cmd)}
                onMouseEnter={() => onHover(i)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                  isSel ? 'bg-secondary/70 text-foreground' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                )}
              >
                <div className="w-6 h-6 shrink-0 rounded-md bg-secondary border border-border flex items-center justify-center">
                  <Icon className="h-3 w-3" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-mono">{cmd.label}</p>
                  <p className="text-[10.5px] text-muted-foreground/60 truncate">{cmd.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
