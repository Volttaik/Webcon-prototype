import { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, X, Brain, Clock, Trash2, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface ApiConversation {
  id: number;
  title: string;
  agentId: number | null;
  agentName: string | null;
  messageCount: number;
  updatedAt: string;
  createdAt: string;
}

async function fetchConversations(): Promise<ApiConversation[]> {
  const res = await fetch('/api/chat/conversations');
  if (!res.ok) return [];
  return res.json();
}

interface Props {
  onClose: () => void;
}

const LONG_PRESS_MS = 550;

function ConvItem({
  conv,
  isActive,
  onSelect,
  onDeleted,
  onRenamed,
}: {
  conv: ApiConversation;
  isActive: boolean;
  onSelect: () => void;
  onDeleted: () => void;
  onRenamed: (title: string) => void;
}) {
  const [pressed, setPressed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(conv.title);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startPress = useCallback(() => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      setPressed(true);
    }, LONG_PRESS_MS);
  }, []);

  const endPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (didLongPress.current) return;
    if (pressed) { setPressed(false); return; }
    onSelect();
  }, [onSelect, pressed]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPressed(false);
    try {
      const res = await fetch(`/api/chat/conversations/${conv.id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        onDeleted();
        toast('Conversation deleted');
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPressed(false);
    setRenameVal(conv.title);
    setRenaming(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const submitRename = async () => {
    const trimmed = renameVal.trim();
    if (!trimmed || trimmed === conv.title) { setRenaming(false); return; }
    try {
      const res = await fetch(`/api/chat/conversations/${conv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      if (res.ok) {
        onRenamed(trimmed);
        toast('Renamed');
      } else {
        toast.error('Failed to rename');
      }
    } catch {
      toast.error('Failed to rename');
    }
    setRenaming(false);
  };

  return (
    <div className="relative mb-0.5 select-none">
      <motion.div
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onClick={handleClick}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.1 }}
        className={cn(
          'w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer',
          isActive
            ? 'bg-secondary border border-border shadow-elevation-sm'
            : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground',
          pressed && 'ring-1 ring-border/60'
        )}
      >
        <div className={cn(
          'w-5 h-5 rounded-md border border-border flex items-center justify-center shrink-0 mt-0.5',
          isActive ? 'bg-secondary' : 'bg-secondary/40'
        )}>
          <Brain className="h-2.5 w-2.5 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              ref={inputRef}
              autoFocus
              value={renameVal}
              onChange={e => setRenameVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') setRenaming(false);
                e.stopPropagation();
              }}
              onBlur={submitRename}
              onClick={e => e.stopPropagation()}
              className="w-full bg-transparent text-[12px] font-medium text-foreground border-b border-border/60 outline-none py-0.5"
            />
          ) : (
            <p className={cn('text-[12px] truncate', isActive ? 'font-medium text-foreground' : '')}>{conv.title}</p>
          )}
          {conv.agentName && (
            <p className="text-[10.5px] text-muted-foreground/60 truncate mt-0.5">{conv.agentName}</p>
          )}
          <p className="text-[10px] text-muted-foreground/40 mt-0.5">
            {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {pressed && !renaming && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-1 top-1 z-10 flex items-center gap-1 bg-background border border-border rounded-lg px-1.5 py-1 shadow-elevation-md"
            onClick={e => e.stopPropagation()}
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={startRename}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Pencil className="h-3 w-3" /> Rename
            </motion.button>
            <div className="w-px h-3.5 bg-border" />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleDelete}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </motion.button>
            <div className="w-px h-3.5 bg-border" />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={e => { e.stopPropagation(); setPressed(false); }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="h-3 w-3" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ConversationSidebar({ onClose }: Props) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: conversations = [], isPending } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  const [localConvs, setLocalConvs] = useState<ApiConversation[] | null>(null);
  const displayed = localConvs ?? conversations;

  const filtered = displayed.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.agentName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const now = Date.now();
  const groups = [
    { label: 'Today', items: filtered.filter(c => now - new Date(c.updatedAt).getTime() < 86_400_000) },
    { label: 'Earlier', items: filtered.filter(c => now - new Date(c.updatedAt).getTime() >= 86_400_000) },
  ];

  const handleSelect = (convId: number) => {
    navigate(`/chat/${convId}`);
    onClose();
  };

  const handleDeleted = (convId: number) => {
    const next = displayed.filter(c => c.id !== convId);
    setLocalConvs(next);
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    if (String(id) === String(convId)) navigate('/chat');
  };

  const handleRenamed = (convId: number, title: string) => {
    const next = displayed.map(c => c.id === convId ? { ...c, title } : c);
    setLocalConvs(next);
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  return (
    <motion.div
      initial={{ x: -288 }}
      animate={{ x: 0 }}
      exit={{ x: -288 }}
      transition={{ type: 'spring', stiffness: 340, damping: 34 }}
      className="flex flex-col h-full bg-background border-r border-border w-72 shadow-panel"
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest px-1">Conversations</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="px-3 pt-3 pb-2">
        <Button
          variant="outline" size="sm"
          className="w-full h-8 text-xs justify-start gap-2 shadow-elevation-sm text-muted-foreground hover:text-foreground"
          onClick={() => { navigate('/chat'); onClose(); }}
        >
          <Plus className="h-3.5 w-3.5" /> New conversation
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full h-7 rounded-lg bg-secondary/55 border border-border pl-7 pr-3 text-[12px] focus:outline-none focus:border-foreground/25 transition-colors placeholder:text-muted-foreground/40 shadow-elevation-sm"
          />
        </div>
      </div>

      <div className="px-2 pb-1">
        <p className="text-[10px] text-muted-foreground/40 px-1">Hold to rename or delete</p>
      </div>

      <div className="flex-1 overflow-y-auto py-1 px-1.5">
        {isPending ? (
          <div className="px-1.5 pt-2 space-y-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl animate-pulse">
                <div className="w-5 h-5 rounded-md bg-muted shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {groups.map(group => group.items.length > 0 && (
              <div key={group.label} className="mb-2">
                <p className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest">{group.label}</p>
                {group.items.map(conv => (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    isActive={String(id) === String(conv.id)}
                    onSelect={() => handleSelect(conv.id)}
                    onDeleted={() => handleDeleted(conv.id)}
                    onRenamed={(title) => handleRenamed(conv.id, title)}
                  />
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-[12px] text-muted-foreground">
                  {displayed.length === 0 ? 'No conversations yet. Start one!' : 'No conversations found'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-medium shrink-0">
            {user?.firstName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium">{user?.firstName || 'User'}</p>
            <p className="text-[10.5px] text-muted-foreground/60">{displayed.length} conversations</p>
          </div>
          <Clock className="h-3 w-3 text-muted-foreground/30 shrink-0" />
        </div>
      </div>
    </motion.div>
  );
}
