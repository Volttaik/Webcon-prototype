import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Copy, Check, Globe, PenLine, FileText, BookOpen,
  FolderPlus, ImageOff, Database, ThumbsUp, ThumbsDown,
  Bookmark, BookmarkCheck, Pin, PinOff, RotateCcw, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Message {
  id: number | string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string | null;
  timestamp: Date;
  thinkMs?: number;
  verb?: string;
}

export type VerbType = 'thinking' | 'searching' | 'creating-project' | 'creating-file' | 'reading' | 'creating' | 'planning' | 'reading-hub';

const VERB_CONFIG: Record<string, { Icon: React.ElementType; label: string; doneLabel: (ms: number) => string }> = {
  thinking:          { Icon: Brain,      label: 'Thinking…',              doneLabel: ms => ms <= 0 ? 'Thought' : `Thought for ${Math.round(ms / 1000)}s` },
  searching:         { Icon: Globe,      label: 'Searching the web…',     doneLabel: ms => ms <= 0 ? 'Searched' : `Searched in ${Math.round(ms / 1000)}s` },
  reading:           { Icon: BookOpen,   label: 'Reading database…',      doneLabel: ms => ms <= 0 ? 'Read database' : `Read in ${Math.round(ms / 1000)}s` },
  'reading-hub':     { Icon: Database,   label: 'Looking at database…',   doneLabel: ms => ms <= 0 ? 'Read hub database' : `Read hub in ${Math.round(ms / 1000)}s` },
  creating:          { Icon: PenLine,    label: 'Creating…',              doneLabel: ms => ms <= 0 ? 'Created' : `Created in ${Math.round(ms / 1000)}s` },
  planning:          { Icon: FileText,   label: 'Planning…',              doneLabel: ms => ms <= 0 ? 'Planned' : `Planned in ${Math.round(ms / 1000)}s` },
  'creating-project':{ Icon: FolderPlus, label: 'Creating project…',      doneLabel: ms => ms <= 0 ? 'Created project' : `Created project in ${Math.round(ms / 1000)}s` },
  'creating-file':   { Icon: PenLine,    label: 'Creating file…',         doneLabel: ms => ms <= 0 ? 'Created file' : `Created file in ${Math.round(ms / 1000)}s` },
};

function useLocalSet(key: string) {
  const [set, setSet] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')); } catch { return new Set(); }
  });
  const toggle = useCallback((id: string) => {
    setSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }, [key]);
  return { set, toggle };
}

function useLocalMap(key: string) {
  const [map, setMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? '{}'); } catch { return {}; }
  });
  const set = useCallback((id: string, value: string | null) => {
    setMap(prev => {
      const next = { ...prev };
      if (value === null) delete next[id]; else next[id] = value;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, [key]);
  return { map, set };
}

function AgentAvatar({ name }: { name?: string | null }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'AI';
  const hue = name ? [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360 : 220;
  return (
    <div
      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-bold text-white shadow-sm"
      style={{ background: `hsl(${hue},55%,48%)` }}
    >
      {initials}
    </div>
  );
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.button onClick={copy} whileTap={{ scale: 0.88 }}
      className={cn('flex items-center gap-1 px-1.5 py-1 rounded-lg transition-all duration-150 text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary/60', className)}
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </motion.button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="my-3 rounded-xl border border-border bg-secondary/30 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">{lang || 'code'}</span>
        <motion.button onClick={copy} whileTap={{ scale: 0.92 }} className="flex items-center gap-1.5 text-muted-foreground/60 hover:text-foreground transition-colors">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
        </motion.button>
      </div>
      <pre className="p-3.5 overflow-x-auto font-mono text-[11.5px] leading-relaxed text-foreground/75">{code}</pre>
    </div>
  );
}

function InlineHighlight({ children }: { children: React.ReactNode }) {
  return (
    <span className={cn(
      'inline rounded px-[5px] py-[1.5px] mx-[1px] font-semibold text-foreground',
      'bg-foreground/[0.08] border border-foreground/[0.12] backdrop-blur-sm',
      'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
    )}>
      {children}
    </span>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <InlineHighlight key={i}>{part.slice(2, -2)}</InlineHighlight>;
    }
    return <span key={i}>{part}</span>;
  });
}

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
              if (line.startsWith('- ') || line.startsWith('· '))
                return (
                  <p key={j} className="flex gap-2 text-[13px] text-foreground/80 leading-[1.7] py-[1px] ml-1">
                    <span className="text-muted-foreground/50 shrink-0 mt-[2px]">–</span>
                    <span>{renderInline(line.slice(2))}</span>
                  </p>
                );
              if (!line.trim()) return <div key={j} className="h-3" />;
              return <p key={j} className="text-[13px] text-foreground/85 leading-[1.75]">{renderInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function TypewriterAssistant({ content, active }: { content: string; active: boolean }) {
  const [shown, setShown] = useState(active ? '' : content);
  const targetRef = useRef(content);
  const shownLenRef = useRef(active ? 0 : content.length);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { targetRef.current = content; }, [content]);

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (!active) {
      const remaining = targetRef.current.length - shownLenRef.current;
      if (remaining <= 0) { setShown(content); shownLenRef.current = content.length; return; }
      intervalRef.current = setInterval(() => {
        const target = targetRef.current;
        const cur = shownLenRef.current;
        if (cur >= target.length) { clearInterval(intervalRef.current!); intervalRef.current = null; return; }
        const next = Math.min(cur + 10, target.length);
        shownLenRef.current = next;
        setShown(target.slice(0, next));
      }, 12);
      return;
    }
    intervalRef.current = setInterval(() => {
      const target = targetRef.current;
      const cur = shownLenRef.current;
      if (cur >= target.length) return;
      const lag = target.length - cur;
      const charsPerTick = lag > 120 ? 10 : lag > 50 ? 5 : lag > 20 ? 3 : 2;
      const next = Math.min(cur + charsPerTick, target.length);
      shownLenRef.current = next;
      setShown(target.slice(0, next));
    }, 18);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [active]);

  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  return (
    <div className="relative">
      <AssistantContent content={shown} />
      {active && (
        <motion.span className="inline-flex items-center gap-1 mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}>
            <PenLine className="h-3 w-3 text-muted-foreground/50" strokeWidth={1.5} />
          </motion.span>
        </motion.span>
      )}
    </div>
  );
}

function ActionBadge({ ms, verb = 'thinking' }: { ms: number; verb?: string }) {
  const config = VERB_CONFIG[verb] ?? VERB_CONFIG.thinking;
  const { Icon, doneLabel } = config;
  return (
    <div className="flex flex-col mb-3">
      <div className="flex items-center gap-1.5 pl-[3.5px] mb-1">
        <div className="flex flex-col items-center gap-[3px]">
          <motion.span className="block w-[5px] h-[5px] rounded-full border border-border/60 bg-background" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }} />
          <motion.span className="block w-px bg-border/40 origin-top" initial={{ scaleY: 0, height: 12 }} animate={{ scaleY: 1 }} transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }} style={{ height: 12 }} />
        </div>
      </div>
      <motion.div className="flex items-center gap-1.5" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.35 }}>
        <Icon className="h-[11px] w-[11px] text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
        <span className="text-[11px] text-muted-foreground/40 italic">{doneLabel(ms)}</span>
      </motion.div>
      <div className="flex items-center gap-1.5 pl-[3.5px] mt-1.5 mb-2">
        <motion.span className="block w-px bg-border/40 origin-top" initial={{ scaleY: 0, height: 12 }} animate={{ scaleY: 1 }} transition={{ duration: 0.35, delay: 0.5, ease: 'easeOut' }} style={{ height: 12 }} />
      </div>
    </div>
  );
}

function PulseDot({ delay }: { delay: number }) {
  return (
    <motion.span className="block w-[4px] h-[4px] rounded-full bg-muted-foreground/40" animate={{ opacity: [0.15, 0.8, 0.15] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay }} />
  );
}

export function VerbIndicator({ verb = 'thinking' }: { verb?: string }) {
  const config = VERB_CONFIG[verb] ?? VERB_CONFIG.thinking;
  const { Icon, label } = config;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-secondary/60 border-border/60"
    >
      <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" strokeWidth={1.5} />
      </motion.div>
      <div className="flex items-center gap-[3px]">
        <PulseDot delay={0} /><PulseDot delay={0.2} /><PulseDot delay={0.4} />
      </div>
      <motion.span key={verb} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}
        className="text-[12px] font-medium text-muted-foreground/70"
      >
        {label}
      </motion.span>
    </motion.div>
  );
}

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

function ChatImage({ url }: { url: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground/50 border border-border/40 rounded-xl px-3 py-2">
        <ImageOff className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>Image unavailable</span>
      </div>
    );
  }
  return (
    <img src={url} alt="Attached" onError={() => setErrored(true)}
      className="mt-2 max-w-[260px] max-h-[240px] rounded-xl border border-border/40 object-cover cursor-pointer"
      onClick={() => window.open(url, '_blank')}
    />
  );
}

function FollowUpChips({ suggestions, onSelect }: { suggestions: string[]; onSelect: (s: string) => void }) {
  if (!suggestions.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mt-3 flex flex-wrap gap-1.5"
    >
      {suggestions.map((s, i) => (
        <motion.button
          key={i}
          whileTap={{ scale: 0.96 }}
          whileHover={{ y: -1 }}
          onClick={() => onSelect(s)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11.5px] text-muted-foreground hover:text-foreground border border-border/60 hover:border-foreground/20 bg-secondary/30 hover:bg-secondary/60 transition-all duration-150"
        >
          <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-50" />
          {s}
        </motion.button>
      ))}
    </motion.div>
  );
}

interface Props {
  messages: Message[];
  isThinking?: boolean;
  verb?: string;
  agentName?: string | null;
  onRegenerate?: () => void;
  onEditMessage?: (id: number | string) => void;
  followUpSuggestions?: string[];
  onFollowUp?: (suggestion: string) => void;
  pinnedIds?: Set<string>;
  searchQuery?: string;
}

export default function MessageList({
  messages,
  isThinking,
  verb = 'thinking',
  agentName,
  onRegenerate,
  onEditMessage,
  followUpSuggestions = [],
  onFollowUp,
  pinnedIds,
  searchQuery = '',
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const { set: bookmarked, toggle: toggleBookmark } = useLocalSet('edubridge:bookmarks');
  const { set: pinned, toggle: togglePin } = useLocalSet('edubridge:pins');
  const { map: reactions, set: setReaction } = useLocalMap('edubridge:reactions');

  useEffect(() => {
    if (messages.length !== prevCount.current || isThinking) {
      prevCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isThinking]);

  const lastAssistantIdx = messages.reduce((last, m, i) => m.role === 'assistant' ? i : last, -1);

  const effectivePinned = pinnedIds ?? pinned;

  const pinnedMessages = messages.filter(m => effectivePinned.has(String(m.id)) && m.role === 'assistant');

  const highlight = (text: string) => {
    if (!searchQuery.trim()) return text;
    return text;
  };

  const matchesSearch = (msg: Message) => {
    if (!searchQuery.trim()) return true;
    return msg.content.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto chat-ambient-bg">
      <div className="relative z-10 max-w-2xl mx-auto w-full px-5 md:px-8 py-8 space-y-1">

        {/* Pinned messages strip */}
        <AnimatePresence>
          {pinnedMessages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 space-y-2"
            >
              <div className="flex items-center gap-1.5">
                <Pin className="h-3 w-3 text-amber-500/70" strokeWidth={1.5} />
                <span className="text-[10px] font-medium text-amber-500/70 uppercase tracking-wider">Pinned</span>
              </div>
              {pinnedMessages.map(m => (
                <p key={m.id} className="text-[12px] text-foreground/70 leading-relaxed line-clamp-2">{m.content}</p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {messages.filter(matchesSearch).map((msg, idx) => {
            const originalIdx = messages.indexOf(msg);
            const prevMsg = messages[originalIdx - 1];
            const showDivider = originalIdx > 0 && prevMsg?.role === 'user' && msg.role === 'assistant';
            const isStreamingMsg = isThinking && originalIdx === lastAssistantIdx && msg.role === 'assistant';
            const isLastAssistant = originalIdx === lastAssistantIdx && msg.role === 'assistant';
            const msgIdStr = String(msg.id);
            const isBookmarked = bookmarked.has(msgIdStr);
            const isPinned = effectivePinned.has(msgIdStr);
            const reaction = reactions[msgIdStr];

            if (msg.role === 'assistant') {
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="group">
                  {showDivider && <DateDivider date={msg.timestamp} />}
                  <div className="py-3 rounded-2xl px-1">
                    <div className="flex items-start gap-2 mb-1.5">
                      <AgentAvatar name={agentName} />
                      <span className="text-[11px] text-muted-foreground/50 mt-1">{agentName ?? 'EduBridge'}</span>
                      <span
                        className="text-[10px] text-muted-foreground/30 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={msg.timestamp.toLocaleString()}
                      >
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {msg.thinkMs !== undefined && (
                      <ActionBadge ms={msg.thinkMs} verb={msg.verb ?? 'thinking'} />
                    )}
                    <TypewriterAssistant content={msg.content} active={!!isStreamingMsg} />

                    {isLastAssistant && !isStreamingMsg && followUpSuggestions.length > 0 && onFollowUp && (
                      <FollowUpChips suggestions={followUpSuggestions} onSelect={onFollowUp} />
                    )}

                    {!isStreamingMsg && (
                      <div className="flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <CopyButton text={msg.content} />

                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setReaction(msgIdStr, reaction === 'up' ? null : 'up')}
                          className={cn(
                            'p-1.5 rounded-lg transition-all duration-150',
                            reaction === 'up'
                              ? 'text-green-500 bg-green-500/10'
                              : 'text-muted-foreground/40 hover:text-green-500 hover:bg-secondary/60'
                          )}
                          title="Helpful"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setReaction(msgIdStr, reaction === 'down' ? null : 'down')}
                          className={cn(
                            'p-1.5 rounded-lg transition-all duration-150',
                            reaction === 'down'
                              ? 'text-red-400 bg-red-400/10'
                              : 'text-muted-foreground/40 hover:text-red-400 hover:bg-secondary/60'
                          )}
                          title="Not helpful"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => toggleBookmark(msgIdStr)}
                          className={cn(
                            'p-1.5 rounded-lg transition-all duration-150',
                            isBookmarked
                              ? 'text-amber-400 bg-amber-400/10'
                              : 'text-muted-foreground/40 hover:text-amber-400 hover:bg-secondary/60'
                          )}
                          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                          {isBookmarked ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => togglePin(msgIdStr)}
                          className={cn(
                            'p-1.5 rounded-lg transition-all duration-150',
                            isPinned
                              ? 'text-blue-400 bg-blue-400/10'
                              : 'text-muted-foreground/40 hover:text-blue-400 hover:bg-secondary/60'
                          )}
                          title={isPinned ? 'Unpin' : 'Pin to top'}
                        >
                          {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                        </motion.button>

                        {isLastAssistant && onRegenerate && (
                          <motion.button
                            whileTap={{ scale: 0.88 }}
                            onClick={onRegenerate}
                            className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-secondary/60 transition-all duration-150"
                            title="Regenerate response"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </motion.button>
                        )}
                      </div>
                    )}
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
                className="group flex flex-col items-end py-2 gap-1"
              >
                {msg.imageUrl && <ChatImage url={msg.imageUrl} />}
                {msg.content && msg.content !== '[User sent an image]' && (
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={cn(
                        'inline-block px-4 py-2.5 rounded-2xl text-[13px] text-foreground/85 leading-relaxed',
                        'elevated-surface border-border/70 max-w-[80%] shadow-elevation-md',
                        onEditMessage && 'cursor-pointer hover:border-foreground/20 transition-colors'
                      )}
                      onClick={() => onEditMessage?.(msg.id)}
                      title={onEditMessage ? 'Click to edit' : undefined}
                    >
                      {searchQuery.trim()
                        ? <HighlightedText text={msg.content} query={searchQuery} />
                        : msg.content
                      }
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <span className="text-[10px] text-muted-foreground/30 mr-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <CopyButton text={msg.content} />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {isThinking && (
            <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="py-2">
              <VerbIndicator verb={verb} />
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-amber-400/30 text-foreground rounded px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}
