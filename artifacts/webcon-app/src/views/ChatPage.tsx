import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, Share, Brain, ChevronDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppHeader from '@/components/layout/AppHeader';
import ConversationSidebar from '@/components/chat/ConversationSidebar';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import EmptyChat from '@/components/chat/EmptyChat';
import AgentCreatorDialog from '@/components/AgentCreatorDialog';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAgents } from '@/lib/data-service';

interface ChatMessage {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
  timestamp: Date;
  thinkMs?: number;
  verb?: string;
}

interface ApiConversation {
  id: number;
  title: string;
  agentId: number | null;
  agentName: string | null;
  agentSubject: string | null;
  updatedAt: string;
}

interface ApiMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  verb: string | null;
  thinkMs: number | null;
  createdAt: string;
}

function verbFromString(v: string | null | undefined): string {
  if (!v) return 'thinking';
  return v;
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -12 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
          >
            <div className="bg-background border border-border rounded-2xl shadow-elevation-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search conversations…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {q && (
                  <button onClick={() => setQ('')} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={onClose} className="text-[11px] text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">esc</button>
              </div>
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">Open the sidebar to browse conversations</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function ChatPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [activeVerb, setActiveVerb] = useState<string>('thinking');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentConv, setCurrentConv] = useState<ApiConversation | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [showFirstAgentCreator, setShowFirstAgentCreator] = useState(false);
  const [dismissedFirstAgentCreator, setDismissedFirstAgentCreator] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const agentIdFromQuery = searchParams.get('agent');

  const { data: agents = [], isPending: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(),
  });

  useEffect(() => {
    if (!agentsLoading && agents.length === 0 && !dismissedFirstAgentCreator) {
      setShowFirstAgentCreator(true);
    }
  }, [agentsLoading, agents.length, dismissedFirstAgentCreator]);

  const loadConversation = useCallback(async (convId: string) => {
    setIsLoadingConversation(true);
    setMessages([]);
    setCurrentConv(null);
    try {
      const [convRes, msgRes] = await Promise.all([
        fetch(`/api/chat/conversations/${convId}`),
        fetch(`/api/chat/conversations/${convId}/messages`),
      ]);
      if (!convRes.ok) return;
      const conv: ApiConversation = await convRes.json();
      setCurrentConv(conv);
      if (msgRes.ok) {
        const msgs: ApiMessage[] = await msgRes.json();
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.createdAt),
            thinkMs: m.thinkMs ?? undefined,
            verb: verbFromString(m.verb),
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load conversation', err);
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  useEffect(() => {
    if (id && id !== 'new') {
      loadConversation(id);
    } else {
      setCurrentConv(null);
      setMessages([]);
    }
  }, [id, loadConversation]);

  // Initialize selected agent from query param or first agent
  useEffect(() => {
    if (agentIdFromQuery) {
      setSelectedAgentId(parseInt(agentIdFromQuery));
    } else if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agentIdFromQuery, agents]);

  const handleSend = useCallback(async (content: string, imageUrl?: string) => {
    if (isStreaming) return;

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content || (imageUrl ? '[User sent an image]' : ''),
      imageUrl: imageUrl || null,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setActiveVerb('thinking');
    setStreamingText('');

    try {
      let convId = id && id !== 'new' ? parseInt(id) : null;

      if (!convId) {
        const agentId = selectedAgentId ?? agents[0]?.id ?? null;

        const res = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId,
            title: content.slice(0, 60),
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || 'Failed to start conversation');
          setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
          setIsStreaming(false);
          return;
        }

        const conv: ApiConversation = await res.json();
        convId = conv.id;
        setCurrentConv(conv);
        navigate(`/chat/${conv.id}`, { replace: true });
      }

      abortRef.current = new AbortController();

      const res = await fetch(`/api/chat/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, imageUrl }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        const errMsg = err.error || 'Failed to send message';
        toast.error(errMsg);
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let accumulatedText = '';
      let finalVerb: string = 'thinking';
      let finalThinkMs = 0;
      let assistantMsgId: number | null = null;
      let userMsgId: number | null = null;

      const assistantTempId = `streaming-${Date.now()}`;
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempUserMsg.id),
        { ...tempUserMsg, id: tempUserMsg.id },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(raw);
          } catch {
            continue;
          }

          if (evt.type === 'verb') {
            const v = evt.verb as string;
            setActiveVerb(v || 'thinking');
            finalVerb = v || 'thinking';
          } else if (evt.type === 'text') {
            accumulatedText += evt.text as string;
            setStreamingText(accumulatedText);

            setMessages(prev => {
              const existing = prev.find(m => m.id === assistantTempId);
              if (existing) {
                return prev.map(m =>
                  m.id === assistantTempId
                    ? { ...m, content: accumulatedText }
                    : m
                );
              }
              return [
                ...prev,
                {
                  id: assistantTempId,
                  role: 'assistant',
                  content: accumulatedText,
                  timestamp: new Date(),
                  verb: finalVerb,
                },
              ];
            });
          } else if (evt.type === 'tool_use') {
            const tool = evt.tool as string;
            const path = evt.path as string | undefined;
            if (tool === 'web_search') {
              toast.info(`Searched: ${evt.query}`, { icon: '🔍' });
            } else if (tool === 'create_document' || tool === 'plan_schedule') {
              queryClient.invalidateQueries({ queryKey: ['workspace'] });
              toast.success(`Saved "${evt.title}" to your workspace`, {
                action: path ? {
                  label: 'Open Workspace',
                  onClick: () => navigate(path),
                } : undefined,
                duration: 6000,
              });
            } else if (tool === 'create_project') {
              queryClient.invalidateQueries({ queryKey: ['projects'] });
              toast.success(`Created project: "${evt.title}"`, {
                action: path ? {
                  label: 'View Projects',
                  onClick: () => navigate(path),
                } : undefined,
                duration: 6000,
              });
            }
          } else if (evt.type === 'done') {
            userMsgId = evt.userMessageId as number;
            assistantMsgId = evt.assistantMessageId as number;
            finalThinkMs = evt.thinkMs as number;
            finalVerb = verbFromString(evt.verb as string);
            queryClient.invalidateQueries({ queryKey: ['credits'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          } else if (evt.type === 'error') {
            toast.error(evt.error as string || 'AI error');
          }
        }
      }

      setMessages(prev =>
        prev.map(m => {
          if (m.id === tempUserMsg.id && userMsgId) return { ...m, id: userMsgId };
          if (m.id === assistantTempId && assistantMsgId) {
            return {
              ...m,
              id: assistantMsgId,
              content: accumulatedText,
              thinkMs: finalThinkMs,
              verb: finalVerb,
            };
          }
          return m;
        })
      );

      setStreamingText('');
      setIsStreaming(false);
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error(err);
      toast.error('Connection error. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      setIsStreaming(false);
    }
  }, [id, isStreaming, navigate, agents, selectedAgentId, queryClient]);

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStreamingText('');
  };

  const effectiveAgentId = currentConv?.agentId ?? selectedAgentId;
  const currentAgent = effectiveAgentId
    ? agents.find(a => a.id === effectiveAgentId)
    : agents[0] ?? null;

  return (
    <div className="min-h-screen app-ambient-bg flex flex-col">
      <AppHeader />
      <Toaster />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AnimatePresence>
        {showFirstAgentCreator && (
          <AgentCreatorDialog
            firstAgentFree
            onClose={() => {
              setDismissedFirstAgentCreator(true);
              setShowFirstAgentCreator(false);
            }}
            onCreate={(agent) => {
              queryClient.invalidateQueries({ queryKey: ['agents'] });
              if (agent.id) {
                setSelectedAgentId(agent.id);
                navigate(`/chat?agent=${agent.id}`, { replace: true });
              }
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-1 pt-12 overflow-hidden" style={{ height: 'calc(100vh - 48px)' }}>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 z-20 bg-background/60 backdrop-blur-[2px]"
              style={{ top: 48 }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="sidebar"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="absolute left-0 top-12 bottom-0 z-30 flex"
            >
              <ConversationSidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col flex-1 overflow-hidden w-full relative z-10">
          <div className="h-11 border-b border-border/70 flex items-center justify-between px-3 shrink-0 bg-background/95 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur-md shadow-elevation-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarOpen(o => !o)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
              {currentConv ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-secondary border border-border flex items-center justify-center">
                    <Brain className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium truncate max-w-[160px] md:max-w-xs">{currentConv.title}</span>
                  {currentConv.agentName && (
                    <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-secondary/50">
                      {currentConv.agentName} <ChevronDown className="h-3 w-3" />
                    </span>
                  )}
                </div>
              ) : currentAgent ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-secondary border border-border flex items-center justify-center">
                    <Brain className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    New conversation with {currentAgent.name}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">New conversation</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1.5 hidden sm:flex">
                <Share className="h-3.5 w-3.5" /> Share
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {isLoadingConversation ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex-1 overflow-y-auto px-4 py-6 space-y-6 chat-ambient-bg"
              >
                {[
                  { align: 'left',  lines: ['w-64', 'w-44'] },
                  { align: 'right', lines: ['w-48'] },
                  { align: 'left',  lines: ['w-72', 'w-56', 'w-36'] },
                  { align: 'right', lines: ['w-40', 'w-32'] },
                  { align: 'left',  lines: ['w-60'] },
                ].map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 ${msg.align === 'right' ? 'flex-row-reverse' : ''}`}>
                    {msg.align === 'left' && <div className="w-6 h-6 rounded-full bg-muted shrink-0 mt-0.5 animate-pulse" />}
                    <div className={`space-y-1.5 ${msg.align === 'right' ? 'items-end flex flex-col' : ''}`}>
                      {msg.lines.map((w, j) => (
                        <div key={j} className={`h-3.5 bg-muted rounded-lg animate-pulse ${w}`}
                          style={{ animationDelay: `${(i * 3 + j) * 60}ms` }} />
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : messages.length === 0 && !isStreaming ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col min-h-0 chat-ambient-bg"
              >
                <EmptyChat onSend={handleSend} />
              </motion.div>
            ) : (
              <motion.div
                key="messages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col flex-1 min-h-0"
              >
                <MessageList messages={messages} isThinking={isStreaming} verb={activeVerb} />
                <div className="shrink-0 border-t border-border/70 bg-background/95 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-md shadow-elevation-md">
                  <MessageInput
                    onSend={handleSend}
                    isStreaming={isStreaming}
                    onStop={handleStop}
                    agents={agents}
                    selectedAgentId={currentConv?.agentId ?? selectedAgentId}
                    onAgentChange={agId => !currentConv && setSelectedAgentId(agId)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
