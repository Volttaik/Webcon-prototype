import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Check, Brain, Menu, ChevronRight, Sun, Moon, Monitor, Coins, Loader2, Zap, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import AppHeader from '@/components/layout/AppHeader';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAgents, deleteAgent, type Agent } from '@/lib/data-service';

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function ProfileSettings() {
  const { user, profile, updateProfile, refreshProfile, uploadAvatar } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    const result = await updateProfile({ first_name: firstName, last_name: lastName, institution });
    if (result.error) {
      toast.error(result.error);
    } else {
      await refreshProfile();
      setSaved(true);
      toast.success('Profile saved');
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    setUploadingAvatar(true);
    const result = await uploadAvatar(file);
    if (result.error) {
      toast.error(result.error);
    } else {
      await refreshProfile();
      toast.success('Profile photo updated');
    }
    setUploadingAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8 max-w-lg">
      <Section title="Profile">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <div className="w-16 h-16 rounded-full bg-secondary border border-border overflow-hidden shadow-elevation-sm">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-medium text-muted-foreground">
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Member since {user?.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : '—'}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 underline underline-offset-2"
            >
              Change photo
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">First name</Label>
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-9 text-sm shadow-elevation-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Last name</Label>
            <Input value={lastName} onChange={e => setLastName(e.target.value)} className="h-9 text-sm shadow-elevation-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input value={user?.email || ''} disabled className="h-9 text-sm shadow-elevation-sm opacity-60" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">University / Institution</Label>
          <Input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Your institution" className="h-9 text-sm shadow-elevation-sm" />
        </div>
      </Section>
      <Separator />
      <Section title="Notifications" desc="Control when and how WebCon contacts you.">
        <div className="space-y-4">
          {[
            { label: 'Study reminders', desc: 'Get reminders to check in with your agents' },
            { label: 'Session summaries', desc: 'Receive weekly summaries of your study sessions' },
            { label: 'New feature updates', desc: 'Be first to know about new platform features' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-1">
              <div><p className="text-sm">{item.label}</p><p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p></div>
              <Switch defaultChecked={item.label !== 'New feature updates'} />
            </div>
          ))}
        </div>
      </Section>
      <Button size="sm" className="h-9 px-5 text-xs shadow-elevation-sm" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : saved ? <Check className="h-3.5 w-3.5 mr-1.5" /> : null}
        {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
      </Button>
    </motion.div>
  );
}

function AgentsSettings() {
  const queryClient = useQueryClient();
  const { data: agents = [], isLoading } = useQuery({ queryKey: ['agents'], queryFn: fetchAgents });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      toast.success('Agent deleted');
    },
    onError: () => toast.error('Failed to delete agent'),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-lg space-y-6">
      <Section title="Your agents" desc="Manage the AI agents you've created.">
        <div className="space-y-3">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <AnimatePresence>
            {agents.map((agent: Agent & { subscription?: { active: boolean; expiresAt: string; creditsCost: number } | null }) => (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="border border-border rounded-2xl p-4 bg-card shadow-elevation-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center shadow-elevation-sm">
                      <Brain className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.subject} · {agent.conversationCount ?? 0} conversations</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => deleteMutation.mutate(agent.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {agent.level} · {agent.tone} · {agent.domain ?? 'education'}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
          {!isLoading && agents.length === 0 && (
            <div className="border border-border rounded-2xl p-8 text-center">
              <Brain className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1} />
              <p className="text-sm text-muted-foreground">No agents yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create your first agent from the dashboard.</p>
            </div>
          )}
        </div>
      </Section>
    </motion.div>
  );
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ] as const;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-lg space-y-6">
      <Section title="Theme" desc="Choose how WebCon looks for you.">
        <div className="grid grid-cols-3 gap-3">
          {options.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all',
                theme === value
                  ? 'border-foreground bg-secondary shadow-elevation-sm'
                  : 'border-border hover:border-foreground/20 hover:bg-secondary/40'
              )}
            >
              <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <span className="text-xs font-medium">{label}</span>
              {theme === value && (
                <motion.div
                  layoutId="theme-check"
                  className="w-1.5 h-1.5 rounded-full bg-foreground"
                />
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {theme === 'dark'
            ? 'Dark mode active — sharp, minimal dark interface with subtle accents.'
            : theme === 'system'
              ? 'Follows your device\'s system preference.'
              : 'Light mode active — clean, bright interface.'}
        </p>
      </Section>
    </motion.div>
  );
}

function CreditsSettings() {
  const { user } = useAuth();
  const creditBalance = user?.creditBalance ?? 0;

  const packages = [
    { credits: 100,  price: 'Free', desc: 'First agent · 30 days', highlight: true },
    { credits: 500,  price: '₦2,500', desc: '5 agents · 30 days each' },
    { credits: 1200, price: '₦5,000', desc: '12 agents · 30 days each' },
    { credits: 3000, price: '₦10,000', desc: '30 agents · 30 days each' },
    { credits: 7000, price: '₦20,000', desc: 'Best value · 70 agents' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-lg space-y-6">
      <Section title="Credit balance" desc="Your credits let you create agents and chat with them.">
        <div className="border border-border rounded-2xl p-5 bg-card shadow-elevation-sm credit-glow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <Zap className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight">{creditBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">credits available</p>
            </div>
          </div>
          <div className="space-y-2.5 text-xs text-muted-foreground border-t border-border pt-4">
            <div className="flex justify-between items-center">
              <span>Create an agent (30-day access)</span>
              <span className="font-medium text-foreground">100 credits</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Create a hub-powered agent</span>
              <span className="font-medium text-foreground">700 credits</span>
            </div>
            <div className="flex justify-between items-center">
              <span>AI message (per message)</span>
              <span className="font-medium text-foreground">1 credit</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-foreground font-medium">Your first agent</span>
              <span className="text-[10px] bg-secondary border border-border px-2 py-0.5 rounded-full font-medium text-foreground">Free · 30 days</span>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Buy credits" desc="Priced in Naira (₦). Credits never expire.">
        <div className="space-y-2.5">
          {packages.map((pkg) => (
            <motion.button
              key={pkg.credits}
              whileHover={{ x: 2 }}
              transition={{ duration: 0.12 }}
              onClick={() => toast.info('Payment coming soon! We\'ll notify you when it\'s ready.')}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-2xl border bg-card shadow-elevation-sm hover:shadow-elevation-md transition-all text-left group',
                pkg.highlight
                  ? 'border-foreground/20 bg-secondary/40'
                  : 'border-border hover:border-foreground/15'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{pkg.credits.toLocaleString()} credits</p>
                  {pkg.highlight && (
                    <span className="text-[10px] bg-foreground text-background px-1.5 py-0.5 rounded-full font-medium">Free</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{pkg.desc}</p>
              </div>
              <p className="text-sm font-semibold shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">{pkg.price}</p>
            </motion.button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          Every new account gets 100 credits free — enough to create your first agent for 30 days.
        </p>
      </Section>
    </motion.div>
  );
}

const NAV_ITEMS = [
  { value: 'profile', label: 'Profile', desc: 'Personal info & notifications' },
  { value: 'agents', label: 'Agents', desc: 'Manage your agents' },
  { value: 'appearance', label: 'Appearance', desc: 'Theme & display settings' },
  { value: 'credits', label: 'Credits & Store', desc: 'Balance, pricing & top up' },
];

export default function Settings() {
  const [section, setSection] = useState('profile');
  const [navOpen, setNavOpen] = useState(false);

  const current = NAV_ITEMS.find(n => n.value === section)!;

  const selectSection = (val: string) => {
    setSection(val);
    setNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster />

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-64 p-0 pt-14 border-r border-border shadow-panel">
          <div className="p-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">Settings</p>
            <div className="space-y-0.5">
              {NAV_ITEMS.map(item => (
                <motion.button
                  key={item.value}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => selectSection(item.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all',
                    section === item.value
                      ? 'bg-secondary border border-border shadow-elevation-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  <div>
                    <p className={cn('text-xs', section === item.value ? 'font-medium' : '')}>{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  {section === item.value && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </motion.button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <main className="pt-12">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 mb-8"
          >
            <Button
              variant="outline" size="sm"
              className="h-8 gap-2 text-xs shadow-elevation-sm shrink-0"
              onClick={() => setNavOpen(true)}
            >
              <Menu className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Navigation</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">{current.label}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{current.desc}</p>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {section === 'profile' && <ProfileSettings />}
              {section === 'agents' && <AgentsSettings />}
              {section === 'appearance' && <AppearanceSettings />}
              {section === 'credits' && <CreditsSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
