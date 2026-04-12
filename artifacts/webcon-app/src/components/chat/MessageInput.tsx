import { useState, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Square, Brain, ChevronDown, Globe, PenLine, FolderPlus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Agent {
  id: number;
  name: string;
  subject: string;
}

interface Props {
  onSend: (message: string) => void;
  isStreaming?: boolean;
  onStop?: () => void;
  disabled?: boolean;
  agents?: Agent[];
  selectedAgentId?: number | null;
  onAgentChange?: (agentId: number) => void;
}

type VerbHint = 'searching' | 'creating-file' | 'creating-project' | 'reading' | null;

const VERB_HINTS: { pattern: RegExp; verb: VerbHint; Icon: React.ElementType; label: string }[] = [
  { pattern: /^(search|find|look up|lookup|google|search for)/i, verb: 'searching',        Icon: Globe,      label: 'Searching' },
  { pattern: /create\s+(a\s+)?(file|note|document|doc)|new\s+(file|note|document)/i,        verb: 'creating-file',    Icon: PenLine,    label: 'Creating file' },
  { pattern: /create\s+(a\s+)?project|new project/i,                                        verb: 'creating-project', Icon: FolderPlus, label: 'Creating project' },
  { pattern: /^(read|read through|summarize|analyse|analyze|go through|review)/i,           verb: 'reading',          Icon: BookOpen,   label: 'Reading' },
];

function detectHint(text: string): VerbHint {
  if (!text.trim()) return null;
  for (const h of VERB_HINTS) {
    if (h.pattern.test(text.trim())) return h.verb;
  }
  return null;
}

function AgentSelector({ agents, selectedAgentId, onAgentChange, disabled }: {
  agents: Agent[];
  selectedAgentId: number | null;
  onAgentChange: (id: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = agents.find(a => a.id === selectedAgentId) ?? agents[0] ?? null;

  if (agents.length === 0) return null;

  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-secondary/50 disabled:opacity-40 group',
        )}
      >
        <Brain className="h-2.5 w-2.5 shrink-0" strokeWidth={1.5} />
        <span className="max-w-[80px] truncate leading-none">
          {selected ? selected.name : 'No agent'}
        </span>
        <ChevronDown className={cn('h-2.5 w-2.5 shrink-0 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-full mb-2 left-0 z-50 w-52 bg-card border border-border rounded-xl overflow-hidden shadow-elevation-lg"
            >
              <div className="px-3 pt-2.5 pb-1">
                <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Select agent</p>
              </div>
              <div className="pb-1.5 max-h-44 overflow-y-auto">
                {agents.map(agent => (
                  <motion.button
                    key={agent.id}
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.1 }}
                    onClick={() => { onAgentChange(agent.id); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
                      agent.id === (selectedAgentId ?? agents[0]?.id)
                        ? 'bg-secondary/70 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                    )}
                  >
                    <div className="w-5 h-5 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0">
                      <Brain className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium truncate">{agent.name}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate">{agent.subject}</p>
                    </div>
                    {agent.id === (selectedAgentId ?? agents[0]?.id) && (
                      <div className="w-1.5 h-1.5 rounded-full bg-foreground/60 shrink-0" />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MessageInput({ onSend, isStreaming, onStop, disabled, agents = [], selectedAgentId, onAgentChange }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hint = detectHint(value);
  const hintConfig = hint ? VERB_HINTS.find(h => h.verb === hint) : null;

  const handleSend = () => {
    if (!value.trim() || isStreaming) return;
    onSend(value.trim());
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const canSend = !!value.trim() && !isStreaming && !disabled;

  return (
    <div className="px-4 md:px-8 py-4 max-w-2xl mx-auto w-full">
      <div className={cn(
        'border border-border rounded-2xl bg-card/60 backdrop-blur-sm transition-all duration-200 edge-glow',
        !isStreaming && !disabled && 'focus-within:border-foreground/20 focus-within:bg-card focus-within:glow-active'
      )}>
        <AnimatePresence>
          {hintConfig && !isStreaming && (
            <motion.div
              key={hintConfig.verb}
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-1.5 px-3.5 pt-2.5 pb-0"
            >
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/60 border border-border/60">
                <hintConfig.Icon className="h-3 w-3 text-muted-foreground/60 shrink-0" strokeWidth={1.5} />
                <span className="text-[11px] text-muted-foreground/60 font-medium">{hintConfig.label}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => { setValue(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder="Ask a follow-up…"
          rows={1}
          disabled={disabled || isStreaming}
          className="w-full px-4 pt-3.5 pb-1.5 text-[13px] bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/40 disabled:opacity-40 min-h-[44px] max-h-[160px] leading-relaxed"
        />

        <div className="flex items-center justify-between px-2.5 pb-2.5 gap-2">
          <div className="flex items-center gap-0.5">
            {agents.length > 0 && onAgentChange && (
              <AgentSelector
                agents={agents}
                selectedAgentId={selectedAgentId ?? null}
                onAgentChange={onAgentChange}
                disabled={disabled || isStreaming}
              />
            )}
          </div>

          <AnimatePresence mode="wait">
            {isStreaming ? (
              <motion.div
                key="stop"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  size="icon"
                  variant="outline"
                  className="h-7 w-7 rounded-lg"
                  onClick={onStop}
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="send"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  size="icon"
                  className={cn(
                    'h-7 w-7 rounded-lg transition-opacity duration-200',
                    canSend ? 'opacity-100' : 'opacity-25'
                  )}
                  onClick={handleSend}
                  disabled={!canSend}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground/30 mt-2 tracking-wide">
        Here to help you learn — not to do your work for you
      </p>
    </div>
  );
}
