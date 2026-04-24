import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, User, HelpCircle, LogOut, X,
  Brain, BookOpen, CalendarDays, BarChart2, LayoutDashboard,
  Plus, ChevronDown, MessageSquare, Clock, Zap,
  FolderKanban, Briefcase, CreditCard, MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { fetchConversations, type Conversation } from '@/lib/data-service';
import { formatDistanceToNow } from 'date-fns';

const STUDY_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Learning Hub', href: '/learning-hub', icon: BookOpen },
  { label: 'Schedule',     href: '/schedule',     icon: CalendarDays },
];

const WORKSPACE_ITEMS = [
  { label: 'Projects',     href: '/projects',     icon: FolderKanban },
  { label: 'Workspace',    href: '/workspace',    icon: Briefcase },
];

const PROGRESS_ITEMS = [
  { label: 'Analytics',    href: '/analytics',    icon: BarChart2 },
];

const ACCOUNT_ITEMS = [
  { label: 'Billing',      href: '/billing',      icon: CreditCard },
  { label: 'WhatsApp',     href: '/whatsapp',     icon: MessageCircle },
  { label: 'Settings',     href: '/settings',     icon: Settings },
];

const USER_MENU = [
  { label: 'Profile',          icon: User,       action: 'profile'  },
  { label: 'Account Settings', icon: Settings,   action: 'settings' },
  { label: 'Help',             icon: HelpCircle, action: 'help'     },
];

const AVATAR_COLORS = [
  ['hsl(230 60% 22%)', 'hsl(230 70% 70%)'],
  ['hsl(260 60% 22%)', 'hsl(260 70% 72%)'],
  ['hsl(200 60% 20%)', 'hsl(200 65% 68%)'],
  ['hsl(340 55% 22%)', 'hsl(340 65% 70%)'],
  ['hsl(160 50% 18%)', 'hsl(160 55% 62%)'],
  ['hsl(25 55% 20%)',  'hsl(25 65% 68%)'],
];

function InitialsAvatar({ size = 32, name = '', email = '' }: { size?: number; name?: string; email?: string }) {
  const initials = name
    ? name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2)
    : (email[0] ?? '?').toUpperCase();
  const colorIdx = (name.charCodeAt(0) || email.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  const [bg, fg] = AVATAR_COLORS[colorIdx];
  const fontSize = size * 0.38;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: '50%', display: 'block' }}>
      <rect width={size} height={size} fill={bg} />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={fg}
        fontSize={fontSize}
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.5"
      >
        {initials}
      </text>
    </svg>
  );
}

function NavBtn({ label, href, icon: Icon, onClick, glowBrain = false }: {
  label: string; href: string; icon: React.ElementType; onClick: () => void; glowBrain?: boolean;
}) {
  const location = useLocation();
  const active = location.pathname === href || location.pathname.startsWith(href + '/');
  return (
    <motion.button
      whileHover={{ x: 2 }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-[13px]',
        active
          ? 'bg-secondary border border-border text-foreground font-medium shadow-elevation-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
      )}
    >
      <span className={cn(glowBrain && 'brain-glow', 'shrink-0 flex')}>
        <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      </span>
      {label}
    </motion.button>
  );
}

function AgentsSubmenu({ onNavigate }: { onNavigate: (href: string) => void }) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const location = useLocation();
  const active = location.pathname.startsWith('/chat');
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetchConversations(user.id, 4).then(setConversations);
    }
  }, [user?.id]);

  return (
    <div>
      <motion.button
        whileHover={{ x: 2 }}
        transition={{ duration: 0.12 }}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors text-[13px]',
          active
            ? 'bg-secondary border border-border text-foreground font-medium shadow-elevation-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
        )}
      >
        <span className="brain-glow shrink-0 flex">
          <Brain className="h-3.5 w-3.5" strokeWidth={1.5} />
        </span>
        <span className="flex-1">My Agents</span>
        <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-3 mt-0.5 border-l border-border pl-3 space-y-0.5 py-1">
              <button
                onClick={() => onNavigate('/chat')}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <Plus className="h-3 w-3 shrink-0" /> New conversation
              </button>
              <div className="pt-0.5">
                <p className="text-[10px] text-muted-foreground/50 px-2 pb-1 uppercase tracking-wider">Recent</p>
                {conversations.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/50 px-2 py-2">No conversations yet</p>
                ) : (
                  conversations.map(conv => (
                    <motion.button
                      key={conv.id}
                      whileHover={{ x: 1 }}
                      transition={{ duration: 0.1 }}
                      onClick={() => onNavigate(`/chat/${conv.id}`)}
                      className={cn(
                        'w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                        location.pathname === `/chat/${conv.id}`
                          ? 'bg-secondary/70 text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      )}
                    >
                      <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] truncate leading-tight">{conv.title}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5 shrink-0 opacity-40" />
                          <p className="text-[10px] opacity-40 truncate">{formatDistanceToNow(new Date(conv.updated_at ?? conv.updatedAt), { addSuffix: true })}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const go = (href: string) => { navigate(href); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px]"
          />
          <motion.div
            key="panel"
            initial={{ x: -272 }}
            animate={{ x: 0 }}
            exit={{ x: -272 }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-background/90 backdrop-blur-xl border-r border-border flex flex-col shadow-elevation-xl"
            style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.12)' }}
          >
            <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
              <button onClick={() => go('/')} className="flex items-center gap-2 hover:opacity-60 transition-opacity">
                <Logo className="h-4 w-4" />
                <span className="text-sm font-semibold tracking-tight">EduBridge</span>
              </button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="px-3 pt-3 pb-2 shrink-0">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => go('/dashboard')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/25 hover:bg-secondary/40 transition-all text-[13px]"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                New Agent
              </motion.button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1.5">Study</p>
                <div className="space-y-0.5">
                  {STUDY_ITEMS.map(item => (
                    <NavBtn key={item.label} {...item} onClick={() => go(item.href)} />
                  ))}
                  <AgentsSubmenu onNavigate={go} />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1.5">Workspace</p>
                <div className="space-y-0.5">
                  {WORKSPACE_ITEMS.map(item => (
                    <NavBtn key={item.label} {...item} onClick={() => go(item.href)} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1.5">Progress</p>
                <div className="space-y-0.5">
                  {PROGRESS_ITEMS.map(item => (
                    <NavBtn key={item.label} {...item} onClick={() => go(item.href)} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1.5">Account</p>
                <div className="space-y-0.5">
                  {ACCOUNT_ITEMS.map(item => (
                    <NavBtn key={item.label} {...item} onClick={() => go(item.href)} />
                  ))}
                </div>
              </div>
            </nav>

            <SidebarUserFooter onNavigate={go} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SidebarUserFooter({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="px-3 py-3 border-t border-border shrink-0">
      {user && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border rounded-xl px-3 py-2 mb-2.5 bg-secondary/30">
          <Zap className="h-3 w-3 text-muted-foreground/60" />
          <span>{(user.creditBalance ?? 0).toLocaleString()} credits</span>
          <button
            onClick={() => onNavigate('/billing')}
            className="ml-auto text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            Top up
          </button>
        </div>
      )}
      <div
        onClick={() => onNavigate('/settings')}
        className="flex items-center gap-3 px-1 py-1 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer"
      >
        <div className="shrink-0 rounded-full overflow-hidden" style={{ width: 30, height: 30 }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <InitialsAvatar size={30} name={displayName} email={user?.email || ''} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate">{displayName}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'Not signed in'}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="hover:text-foreground">
          <LogOut className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function UserDropdown({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/');
  };

  const handle = (action: string) => {
    onClose();
    if (action === 'settings') navigate('/settings');
    if (action === 'profile')  navigate('/settings');
  };

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || user?.email?.split('@')[0] || 'User';

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-11 z-50 w-56 bg-background border border-border rounded-2xl overflow-hidden shadow-elevation-lg"
          >
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <div className="shrink-0 rounded-full overflow-hidden" style={{ width: 30, height: 30 }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <InitialsAvatar size={30} name={displayName} email={user?.email || ''} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'Not signed in'}</p>
              </div>
            </div>
            <div className="py-1">
              {USER_MENU.map(({ label, icon: Icon, action }) => (
                <motion.button
                  key={label}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => handle(action)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors text-left"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  {label}
                </motion.button>
              ))}
            </div>
            <div className="border-t border-border py-1">
              <motion.button
                whileHover={{ x: 2 }}
                transition={{ duration: 0.1 }}
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors text-left"
              >
                <LogOut className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                Sign Out
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function AppHeader() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [userOpen,  setUserOpen]  = useState(false);

  return (
    <>
      <SidePanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      <header className="fixed top-0 left-0 right-0 z-30 h-12 border-b border-border/70 bg-background/86 backdrop-blur-xl flex items-center px-3 shadow-elevation-md">
        <div className="flex items-center gap-1 flex-1">
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setPanelOpen(true)}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M1.5 3h12M1.5 7.5h12M1.5 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </Button>
          <span className="text-border text-lg font-light select-none mx-0.5">/</span>
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 hover:opacity-60 transition-opacity">
            <Logo className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-tight">EduBridge</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.15 }}
              className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border rounded-full px-2.5 py-1 cursor-pointer hover:border-foreground/20 transition-colors credit-glow"
              onClick={() => navigate('/settings')}
            >
              <Zap className="h-3 w-3" />
              <span>{(user.creditBalance ?? 0).toLocaleString()} credits</span>
            </motion.div>
          )}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setUserOpen(o => !o)}
              className="rounded-full overflow-hidden ring-1 ring-border hover:ring-foreground/30 transition-all"
              style={{ width: 32, height: 32 }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <InitialsAvatar
                  size={32}
                  name={profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : profile?.first_name || ''}
                  email={user?.email || ''}
                />
              )}
            </motion.button>
            <UserDropdown open={userOpen} onClose={() => setUserOpen(false)} />
          </div>
        </div>
      </header>
    </>
  );
}
