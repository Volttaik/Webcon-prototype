import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Copy, Check, Globe, PenLine, FileText, BookOpen, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: number | string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  thinkMs?: number;
  verb?: string;
}

export type VerbType = 'thinking' | 'searching' | 'creating-project' | 'creating-file' | 'reading';

const VERB_CONFIG: Record<VerbType, { Icon: React.ElementType; label: string; doneLabel: (ms: number) => string }> = {
  thinking: {
    Icon: Brain,
    label: 'Thinking…',
    doneLabel: (ms) => ms <= 0 ? 'Thought for a moment' : `Thought for ${Math.round(ms / 1000)}s`,
  },
  searching: {
    Icon: Globe,
    label: 'Searching the web…',
    doneLabel: (ms) => ms <= 0 ? 'Searched' : `Searched in ${Math.round(ms / 1000)}s`,
  },
  'creating-project': {
    Icon: FolderPlus,
    label: 'Creating project…',
    doneLabel: (ms) => ms <= 0 ? 'Created project' : `Created project in ${Math.round(ms / 1000)}s`,
  },
  'creating-file': {
    Icon: PenLine,
    label: 'Creating file…',
    doneLabel: (ms) => ms <= 0 ? 'Created file' : `Created file in ${Math.round(ms / 1000)}s`,
  },
  reading: {
    Icon: BookOpen,
    label: 'Reading…',
    doneLabel: (ms) => ms <= 0 ? 'Read through' : `Read in ${Math.round(ms / 1000)}s`,
  },
};

/* ─── Code block ─── */
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="my-3 rounded-xl border border-border bg-secondary/30 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{lang || 'code'}</span>
        <motion.button onClick={copy} whileTap={{ scale: 0.92 }}
          className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-foreground transition-colors">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
        </motion.button>
      </div>
      <pre className="p-3.5 overflow-x-auto font-mono text-[11.5px] leading-relaxed text-foreground/75">{code}</pre>
    </div>
  );
}

/* ─── Plain text renderer for AI messages ─── */
function AssistantContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.slice(3, -3).split('\n');
          return <CodeBlock key={i} code={lines.slice(1).join('\n')} lang={lines[0]} />;
        }
        if (!part.trim()) return null;
        return (
          <div key={i}>
            {part.split('\n').map((line, j) => {
              if (line.startsWith('**') && line.endsWith('**'))
                return <p key={j} className="font-semibold text-[13px] text-foreground mt-4 mb-1.5 first:mt-0">{line.slice(2, -2)}</p>;
              if (line.startsWith('- ') || line.startsWith('· '))
                return (
                  <p key={j} className="flex gap-2 text-[13px] text-foreground/80 leading-[1.7] py-[1px] ml-1">
                    <span className="text-muted-foreground/50 shrink-0 mt-[2px]">–</span>
                    <span>{line.slice(2)}</span>
                  </p>
                );
              if (!line.trim()) return <div key={j} className="h-3" />;
              return <p key={j} className="text-[13px] text-foreground/85 leading-[1.75]">{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Typewriter assistant message with pen cursor ─── */
function TypewriterAssistant({ content, active }: { content: string; active: boolean }) {
  const [shown, setShown] = useState(active ? '' : content);
  const targetRef = useRef(content);
  const shownLenRef = useRef(active ? 0 : content.length);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    targetRef.current = content;
  }, [content]);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setShown(content);
      shownLenRef.current = content.length;
      return;
    }
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      const target = targetRef.current;
      const cur = shownLenRef.current;
      if (cur < target.length) {
        const next = Math.min(cur + 2, target.length);
        shownLenRef.current = next;
        setShown(target.slice(0, next));
      }
    }, 22);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <AssistantContent content={shown} />
      {active && (
        <motion.span
          className="inline-flex items-center gap-1 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            <PenLine className="h-3 w-3 text-muted-foreground/50" strokeWidth={1.5} />
          </motion.span>
        </motion.span>
      )}
    </div>
  );
}

/* ─── Action badge shown after response (e.g. "Thought for 2s") ─── */
function ActionBadge({ ms, verb = 'thinking' }: { ms: number; verb?: VerbType }) {
  const { Icon, doneLabel } = VERB_CONFIG[verb] ?? VERB_CONFIG.thinking;
  return (
    <div className="flex flex-col mb-3">
      <div className="flex items-center gap-1.5 pl-[3.5px] mb-1">
        <div className="flex flex-col items-center gap-[3px]">
          <motion.span
            className="block w-[5px] h-[5px] rounded-full border border-border/60 bg-background"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, delay: 0 }}
          />
          <motion.span
            className="block w-px bg-border/40 origin-top"
            initial={{ scaleY: 0, height: 12 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
            style={{ height: 12 }}
          />
        </div>
      </div>
      <motion.div
        className="flex items-center gap-1.5"
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <Icon className="h-[11px] w-[11px] text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
        <span className="text-[11px] text-muted-foreground/40 italic">{doneLabel(ms)}</span>
      </motion.div>
      <div className="flex items-center gap-1.5 pl-[3.5px] mt-1.5 mb-2">
        <motion.span
          className="block w-px bg-border/40 origin-top"
          initial={{ scaleY: 0, height: 12 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.35, delay: 0.5, ease: 'easeOut' }}
          style={{ height: 12 }}
        />
      </div>
    </div>
  );
}

/* ─── Pulse dots ─── */
function PulseDot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="block w-[4px] h-[4px] rounded-full bg-muted-foreground/40"
      animate={{ opacity: [0.15, 0.8, 0.15] }}
      transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

const VERB_COLORS: Record<VerbType, string> = {
  thinking:          'text-muted-foreground/70',
  searching:         'text-muted-foreground/70',
  'creating-project':'text-muted-foreground/70',
  'creating-file':   'text-muted-foreground/70',
  reading:           'text-muted-foreground/70',
};

const VERB_BG: Record<VerbType, string> = {
  thinking:          'bg-secondary/60 border-border/60',
  searching:         'bg-secondary/60 border-border/60',
  'creating-project':'bg-secondary/60 border-border/60',
  'creating-file':   'bg-secondary/60 border-border/60',
  reading:           'bg-secondary/60 border-border/60',
};

/* ─── Active verb indicator ─── */
function VerbIndicator({ verb = 'thinking' }: { verb?: VerbType }) {
  const { Icon, label } = VERB_CONFIG[verb] ?? VERB_CONFIG.thinking;
  const colorClass = VERB_COLORS[verb] ?? VERB_COLORS.thinking;
  const bgClass = VERB_BG[verb] ?? VERB_BG.thinking;

  const iconVariants: Record<VerbType, React.ReactNode> = {
    thinking: (
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} strokeWidth={1.5} />
      </motion.div>
    ),
    searching: (
      <motion.div
        animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} strokeWidth={1.5} />
      </motion.div>
    ),
    'creating-project': (
      <motion.div
        animate={{ y: [0, -3, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} strokeWidth={1.5} />
      </motion.div>
    ),
    'creating-file': (
      <motion.div
        animate={{ y: [0, -3, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} strokeWidth={1.5} />
      </motion.div>
    ),
    reading: (
      <motion.div
        animate={{ x: [0, 2.5, -2.5, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} strokeWidth={1.5} />
      </motion.div>
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${bgClass}`}
    >
      {iconVariants[verb]}
      <div className="flex items-center gap-[3px]">
        <PulseDot delay={0} />
        <PulseDot delay={0.2} />
        <PulseDot delay={0.4} />
      </div>
      <motion.span
        key={verb}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className={`text-[12px] font-medium ${colorClass}`}
      >
        {label}
      </motion.span>
    </motion.div>
  );
}

/* ─── Divider between exchanges ─── */
function DateDivider({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-border/40" />
      <span className="text-[10px] text-muted-foreground/35 shrink-0">
        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

interface Props {
  messages: Message[];
  isThinking?: boolean;
  verb?: VerbType;
}

export default function MessageList({ messages, isThinking, verb = 'thinking' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  useEffect(() => {
    if (messages.length !== prevCount.current || isThinking) {
      prevCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isThinking]);

  const lastAssistantIdx = messages.reduce((last, m, i) => m.role === 'assistant' ? i : last, -1);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-5 md:px-8 py-8 space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const prevMsg = messages[idx - 1];
            const showDivider = idx > 0 && prevMsg?.role === 'user' && msg.role === 'assistant';
            const isStreamingMsg = isThinking && idx === lastAssistantIdx && msg.role === 'assistant';

            if (msg.role === 'assistant') {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  {showDivider && <DateDivider date={msg.timestamp} />}
                  <div className="py-3">
                    {msg.thinkMs !== undefined && (
                      <ActionBadge ms={msg.thinkMs} verb={(msg as any).verb ?? 'thinking'} />
                    )}
                    <TypewriterAssistant content={msg.content} active={!!isStreamingMsg} />
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex justify-end py-2"
              >
                <div className={cn(
                  'inline-block px-4 py-2 rounded-full text-[13px] text-foreground/80 leading-relaxed',
                  'border border-dashed border-border/70 bg-secondary/20',
                  'max-w-[80%]'
                )}>
                  {msg.content}
                </div>
              </motion.div>
            );
          })}

          {isThinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="py-2"
            >
              <VerbIndicator verb={verb} />
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
