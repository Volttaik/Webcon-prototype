import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelLeft, Brain, ChevronDown, Search, X,
  BookOpen, GraduationCap, FileText, Bookmark, BookmarkCheck,
  Timer, Keyboard, Sparkles, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppHeader from '@/components/layout/AppHeader';
import ConversationSidebar from '@/components/chat/ConversationSidebar';
import MessageList, { type Message } from '@/components/chat/MessageList';
import MessageInput, { type ReplyContext } from '@/components/chat/MessageInput';
import EmptyChat from '@/components/chat/EmptyChat';
import AgentCreatorDialog from '@/components/AgentCreatorDialog';
import PomodoroWidget from '@/components/chat/PomodoroWidget';
import KeyboardShortcutsDialog from '@/components/chat/KeyboardShortcutsDialog';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAgents } from '@/lib/data-service';
import { cn } from '@/lib/utils';

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

export default function ChatPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [activeVerb, setActiveVerb] = useState<string>('thinking');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConv, setCurrentConv] = useState<ApiConversation | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [showFirstAgentCreator, setShowFirstAgentCreator] = useState(false);
  const [dismissedFirstAgentCreator, setDismissedFirstAgentCreator] = useState(false);

  // New feature state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<number | string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [bookmarkedConvs, setBookmarkedConvs] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('edubridge:conv-bookmarks') ?? '[]')); } catch { return new Set(); }
  });
  const [replyTo, setReplyTo] = useState<ReplyContext | null>(null);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showRecap, setShowRecap] = useState(false);
  const [recapText, setRecapText] = useState<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const abortRef = useRef<AbortController | null>(null);
  // Track conversations we just created so loadConversation doesn't wipe the live stream
  const justCreatedConvRef = useRef<number | null>(null);
  const agentIdFromQuery = searchParams.get('agent');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: agents = [], isPending: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(),
  });

  useEffect(() => {
    if (!agentsLoading && agents.length === 0 && !dismissedFirstAgentCreator) {
      setShowFirstAgentCreator(true);
    }
  }, [agentsLoading, agents.length, dismissedFirstAgentCreator]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') { e.preventDefault(); navigate('/chat'); }
      if (mod && e.key === 'f') { e.preventDefault(); setSearchOpen(o => !o); setTimeout(() => searchInputRef.current?.focus(), 50); }
      if (mod && e.key === '/') { e.preventDefault(); setShortcutsOpen(o => !o); }
      if (e.key === '?' && !mod && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault(); setShortcutsOpen(o => !o);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false); setSearchQuery(''); setEditingMsgId(null); setSidebarOpen(false);
        setShortcutsOpen(false); setReplyTo(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const loadConversation = useCallback(async (convId: string) => {
    setIsLoadingConversation(true);
    setMessages([]);
    setCurrentConv(null);
    setFollowUpSuggestions([]);
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
        setMessages(msgs.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.createdAt),
          thinkMs: m.thinkMs ?? undefined,
          verb: verbFromString(m.verb),
        })));
      }
    } catch (err) {
      console.error('Failed to load conversation', err);
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  useEffect(() => {
    if (id && id !== 'new') {
      // If we just created this conversation in handleSend, skip loading —
      // the live stream is already populating messages in state.
      if (justCreatedConvRef.current === parseInt(id)) {
        justCreatedConvRef.current = null;
        return;
      }
      loadConversation(id);
    } else {
      setCurrentConv(null);
      setMessages([]);
      setFollowUpSuggestions([]);
      setShowRecap(false);
    }
    setReplyTo(null);
  }, [id, loadConversation]);

  // Smart recap on return: if user reopens a conv after >12h, show a banner
  // with the last assistant reply as a "where we left off" reminder.
  useEffect(() => {
    if (!id || id === 'new' || messages.length === 0 || isLoadingConversation) return;
    try {
      const key = 'edubridge:last-visit';
      const map = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, number>;
      const lastVisit = map[id];
      const now = Date.now();
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastVisit && (now - lastVisit > 12 * 60 * 60 * 1000) && lastAssistant) {
        const summary = lastAssistant.content.replace(/\s+/g, ' ').slice(0, 220);
        setRecapText(summary);
        setShowRecap(true);
      }
      map[id] = now;
      localStorage.setItem(key, JSON.stringify(map));
    } catch { /* noop */ }
  }, [id, messages.length, isLoadingConversation]);

  // Reading progress bar — tracks scroll within the messages area.
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setScrollProgress(max > 100 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [messages.length, isLoadingConversation]);

  useEffect(() => {
    if (agentIdFromQuery) {
      setSelectedAgentId(parseInt(agentIdFromQuery));
    } else if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agentIdFromQuery, agents]);

  const fetchFollowUpSuggestions = useCallback(async (content: string, subject?: string) => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/chat/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, subject }),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowUpSuggestions(data.suggestions ?? []);
      }
    } catch { /* noop */ } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  const handleSend = useCallback(async (content: string, imageUrl?: string) => {
    if (isStreaming) return;

    // Quiz mode: prefix the user message
    const sendContent = quizMode && content.trim()
      ? `[QUIZ MODE] ${content}`
      : content;

    setFollowUpSuggestions([]);

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content || (imageUrl ? '[User sent an image]' : ''),
      imageUrl: imageUrl || null,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setActiveVerb('thinking');

    try {
      let convId = id && id !== 'new' ? parseInt(id) : null;

      if (!convId) {
        const agentId = selectedAgentId ?? agents[0]?.id ?? null;
        const res = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId, title: content.slice(0, 60) }),
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
        // Mark this conv as just-created BEFORE navigating so the id-change
        // effect skips calling loadConversation and wiping the live stream.
        justCreatedConvRef.current = conv.id;
        navigate(`/chat/${conv.id}`, { replace: true });
      }

      abortRef.current = new AbortController();

      const res = await fetch(`/api/chat/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sendContent, imageUrl }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to send message');
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
          try { evt = JSON.parse(raw); } catch { continue; }

          if (evt.type === 'verb') {
            const v = evt.verb as string;
            setActiveVerb(v || 'thinking');
            finalVerb = v || 'thinking';
          } else if (evt.type === 'text') {
            accumulatedText += evt.text as string;
            setMessages(prev => {
              const existing = prev.find(m => m.id === assistantTempId);
              if (existing) {
                return prev.map(m => m.id === assistantTempId ? { ...m, content: accumulatedText } : m);
              }
              return [...prev, { id: assistantTempId, role: 'assistant', content: accumulatedText, timestamp: new Date(), verb: finalVerb }];
            });
          } else if (evt.type === 'tool_use') {
            const tool = evt.tool as string;
            const path = evt.path as string | undefined;
            if (tool === 'web_search') {
              toast.info(`Searched: ${evt.query}`, { icon: '🔍' });
            } else if (tool === 'create_document' || tool === 'plan_schedule') {
              queryClient.invalidateQueries({ queryKey: ['workspace'] });
              toast.success(`Saved "${evt.title}" to your workspace`, {
                action: path ? { label: 'Open Workspace', onClick: () => navigate(path) } : undefined,
                duration: 6000,
              });
            } else if (tool === 'create_project') {
              queryClient.invalidateQueries({ queryKey: ['projects'] });
              toast.success(`Created project: "${evt.title}"`, {
                action: path ? { label: 'View Projects', onClick: () => navigate(path) } : undefined,
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
            return { ...m, id: assistantMsgId, content: accumulatedText, thinkMs: finalThinkMs, verb: finalVerb };
          }
          return m;
        })
      );

      setIsStreaming(false);

      // Fetch follow-up suggestions after response
      if (accumulatedText.trim()) {
        const subject = agents.find(a => a.id === (currentConv?.agentId ?? selectedAgentId))?.subject;
        fetchFollowUpSuggestions(accumulatedText, subject);
      }

    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error(err);
      toast.error('Connection error. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      setIsStreaming(false);
    }
  }, [id, isStreaming, navigate, agents, selectedAgentId, queryClient, quizMode, currentConv, fetchFollowUpSuggestions]);

  const handleStop = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const handleRegenerate = useCallback(async () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser || isStreaming) return;
    // Remove last assistant message visually and resend
    setMessages(prev => {
      const lastAssistantIdx = [...prev].map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i >= 0).pop();
      if (lastAssistantIdx === undefined) return prev;
      return prev.filter((_, i) => i !== lastAssistantIdx);
    });
    setFollowUpSuggestions([]);
    await handleSend(lastUser.content);
  }, [messages, isStreaming, handleSend]);

  const handleEditMessage = useCallback((msgId: number | string) => {
    const msg = messages.find(m => m.id === msgId && m.role === 'user');
    if (!msg) return;
    setEditingMsgId(msgId);
    setEditValue(msg.content);
  }, [messages]);

  const handleSubmitEdit = useCallback(async () => {
    if (!editValue.trim() || !editingMsgId) return;
    setEditingMsgId(null);
    await handleSend(editValue.trim());
    setEditValue('');
  }, [editValue, editingMsgId, handleSend]);

  const handleSummary = useCallback(async () => {
    if (isStreaming || messages.length < 2) return;
    await handleSend('Please summarize everything we\'ve discussed in this conversation into a clear, concise study note. Save it to my workspace.');
  }, [isStreaming, messages, handleSend]);

  const handleReply = useCallback((msg: Message) => {
    setReplyTo({ id: msg.id, role: msg.role as 'user' | 'assistant', content: msg.content });
  }, []);

  const handleSimpler = useCallback(async (msg: Message) => {
    if (isStreaming) return;
    const snippet = msg.content.length > 240 ? msg.content.slice(0, 240) + '…' : msg.content;
    await handleSend(`Re-explain this in simpler terms (no jargon, short sentences):\n\n> ${snippet.replace(/\n/g, '\n> ')}`);
  }, [isStreaming, handleSend]);

  const handleDeeper = useCallback(async (msg: Message) => {
    if (isStreaming) return;
    const snippet = msg.content.length > 240 ? msg.content.slice(0, 240) + '…' : msg.content;
    await handleSend(`Go deeper on this — give more detail, examples, and where useful, an analogy:\n\n> ${snippet.replace(/\n/g, '\n> ')}`);
  }, [isStreaming, handleSend]);

  const handleContinueInNewChat = useCallback(() => {
    const agentId = currentConv?.agentId ?? selectedAgentId ?? agents[0]?.id;
    if (!agentId) return;
    navigate(`/chat?agent=${agentId}`);
    toast.success('Started a fresh chat with the same agent');
  }, [currentConv, selectedAgentId, agents, navigate]);

  const toggleConvBookmark = (convId: number) => {
    setBookmarkedConvs(prev => {
      const next = new Set(prev);
      const key = String(convId);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem('edubridge:conv-bookmarks', JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  };

  const effectiveAgentId = currentConv?.agentId ?? selectedAgentId;
  const currentAgent = effectiveAgentId ? agents.find(a => a.id === effectiveAgentId) : agents[0] ?? null;
  const isConvBookmarked = currentConv ? bookmarkedConvs.has(String(currentConv.id)) : false;

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="app-ambient-bg">
      <AppHeader />
      <Toaster />

      <AnimatePresence>
        {showFirstAgentCreator && (
          <AgentCreatorDialog
            firstAgentFree
            onClose={() => { setDismissedFirstAgentCreator(true); setShowFirstAgentCreator(false); }}
            onCreate={(agent) => {
              queryClient.invalidateQueries({ queryKey: ['agents'] });
              if (agent.id) { setSelectedAgentId(agent.id); navigate(`/chat?agent=${agent.id}`, { replace: true }); }
            }}
          />
        )}
      </AnimatePresence>

      {/* Fixed chat area — always occupies exactly the space below the app header */}
      <div className="fixed inset-x-0 bottom-0 flex" style={{ top: '48px' }}>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }} onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 z-20 bg-background/60"
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div key="sidebar" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="absolute left-0 top-0 bottom-0 z-30 flex"
            >
              <ConversationSidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative z-10">
          {/* Toolbar */}
          <div className="h-11 border-b border-border/70 flex items-center justify-between px-3 shrink-0 bg-background/95 shadow-elevation-sm">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(o => !o)}>
                <PanelLeft className="h-4 w-4" />
              </Button>
              {currentConv ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-secondary border border-border flex items-center justify-center">
                    <Brain className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium truncate max-w-[140px] md:max-w-xs">{currentConv.title}</span>
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
                  <span className="text-sm font-medium text-muted-foreground">New conversation with {currentAgent.name}</span>
                </div>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">New conversation</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Search toggle */}
              <Button
                variant="ghost" size="icon"
                className={cn('h-8 w-8', searchOpen ? 'text-foreground bg-secondary' : 'text-muted-foreground hover:text-foreground')}
                onClick={() => { setSearchOpen(o => !o); if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50); }}
                title="Search in conversation (⌘F)"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>

              {/* Quiz mode */}
              <Button
                variant="ghost" size="sm"
                className={cn('h-7 text-xs gap-1.5', quizMode ? 'text-foreground bg-secondary border border-border' : 'text-muted-foreground hover:text-foreground')}
                onClick={() => { setQuizMode(q => !q); toast(quizMode ? 'Quiz mode off' : 'Quiz mode on — get quizzed on your topic!'); }}
                title="Toggle quiz mode"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Quiz</span>
              </Button>

              {/* Summary */}
              {messages.length >= 2 && !isStreaming && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground hidden sm:flex" onClick={handleSummary} title="Summarise & save to workspace">
                  <FileText className="h-3.5 w-3.5" /> Summary
                </Button>
              )}

              {/* Bookmark conversation */}
              {currentConv && (
                <Button
                  variant="ghost" size="icon"
                  className={cn('h-8 w-8', isConvBookmarked ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground')}
                  onClick={() => toggleConvBookmark(currentConv.id)}
                  title={isConvBookmarked ? 'Remove bookmark' : 'Bookmark conversation'}
                >
                  {isConvBookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                </Button>
              )}

              {/* Continue in new chat */}
              {currentConv && messages.length >= 4 && (
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex"
                  onClick={handleContinueInNewChat}
                  title="Continue in a new chat with the same agent"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </Button>
              )}

              {/* Pomodoro */}
              <Button
                variant="ghost" size="icon"
                className={cn('h-8 w-8', pomodoroOpen ? 'text-foreground bg-secondary' : 'text-muted-foreground hover:text-foreground')}
                onClick={() => setPomodoroOpen(o => !o)}
                title="Focus timer (Pomodoro)"
              >
                <Timer className="h-3.5 w-3.5" />
              </Button>

              {/* Keyboard shortcuts */}
              <Button
                variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShortcutsOpen(true)}
                title="Keyboard shortcuts (⌘/)"
              >
                <Keyboard className="h-3.5 w-3.5" />
              </Button>

              {/* Study hub */}
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1.5 hidden sm:flex" onClick={() => navigate('/learning-hub')}>
                <BookOpen className="h-3.5 w-3.5" /> Hubs
              </Button>
            </div>
          </div>

          {/* Reading progress bar */}
          <div className="h-[2px] bg-transparent shrink-0">
            <motion.div
              className="h-full bg-foreground/40 origin-left"
              animate={{ scaleX: scrollProgress }}
              transition={{ duration: 0.08, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
            />
          </div>

          {/* In-chat search bar */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden border-b border-border/60 bg-background/95"
              >
                <div className="flex items-center gap-2 px-4 py-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search messages… (Esc to close)"
                    className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/40"
                  />
                  {searchQuery && (
                    <span className="text-[11px] text-muted-foreground/50">
                      {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quiz mode banner */}
          <AnimatePresence>
            {quizMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-violet-500/10 border-b border-violet-500/20"
              >
                <div className="flex items-center gap-2 px-4 py-2">
                  <GraduationCap className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  <span className="text-[12px] text-violet-400">Quiz mode is on — tell your agent what topic to quiz you on</span>
                  <button onClick={() => setQuizMode(false)} className="ml-auto text-violet-400/60 hover:text-violet-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit message bar */}
          <AnimatePresence>
            {editingMsgId && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-border/60 bg-secondary/30"
              >
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-[11px] text-muted-foreground/60 shrink-0">Edit:</span>
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmitEdit(); if (e.key === 'Escape') setEditingMsgId(null); }}
                    className="flex-1 bg-transparent text-[13px] outline-none"
                  />
                  <Button size="sm" className="h-6 text-xs" onClick={handleSubmitEdit} disabled={!editValue.trim()}>Send</Button>
                  <button onClick={() => setEditingMsgId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {isLoadingConversation ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                className="flex-1 overflow-y-auto px-4 py-6 space-y-6 chat-ambient-bg"
              >
                {[{ align: 'left', lines: ['w-64', 'w-44'] }, { align: 'right', lines: ['w-48'] }, { align: 'left', lines: ['w-72', 'w-56', 'w-36'] }, { align: 'right', lines: ['w-40', 'w-32'] }, { align: 'left', lines: ['w-60'] }].map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 ${msg.align === 'right' ? 'flex-row-reverse' : ''}`}>
                    {msg.align === 'left' && <div className="w-6 h-6 rounded-full bg-muted shrink-0 mt-0.5 animate-pulse" />}
                    <div className={`space-y-1.5 ${msg.align === 'right' ? 'items-end flex flex-col' : ''}`}>
                      {msg.lines.map((w, j) => (
                        <div key={j} className={`h-3.5 bg-muted rounded-lg animate-pulse ${w}`} style={{ animationDelay: `${(i * 3 + j) * 60}ms` }} />
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : messages.length === 0 && !isStreaming ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col min-h-0 chat-ambient-bg">
                <EmptyChat onSend={handleSend} />
              </motion.div>
            ) : (
              <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col flex-1 min-h-0">
                <MessageList
                  messages={searchQuery.trim() ? filteredMessages : messages}
                  isThinking={isStreaming}
                  verb={activeVerb}
                  agentName={currentAgent?.name}
                  onRegenerate={handleRegenerate}
                  onEditMessage={handleEditMessage}
                  followUpSuggestions={followUpSuggestions}
                  onFollowUp={handleSend}
                  searchQuery={searchQuery}
                  onReply={handleReply}
                  onSimpler={handleSimpler}
                  onDeeper={handleDeeper}
                  scrollContainerRef={scrollAreaRef}
                />
                <div className="shrink-0 border-t border-border/70 bg-background/95 shadow-elevation-md">
                  <MessageInput
                    onSend={handleSend}
                    isStreaming={isStreaming}
                    onStop={handleStop}
                    agents={agents}
                    selectedAgentId={currentConv?.agentId ?? selectedAgentId}
                    onAgentChange={agId => !currentConv && setSelectedAgentId(agId)}
                    quizMode={quizMode}
                    replyTo={replyTo}
                    onClearReply={() => setReplyTo(null)}
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

