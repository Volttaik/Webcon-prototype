import { useState } from 'react';
import { X, BookOpen, Coins, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { createAgent } from '@/lib/data-service';

const TONES = [
  { value: 'patient', label: 'Patient & thorough' },
  { value: 'concise', label: 'Concise & direct' },
  { value: 'socratic', label: 'Socratic' },
  { value: 'friendly', label: 'Friendly & warm' },
  { value: 'strict', label: 'Strict & rigorous' },
  { value: 'motivational', label: 'Motivational' },
];

const LEVELS = ['High School', 'Undergraduate', 'Graduate', 'Self-study'];

interface Hub {
  id: number;
  title: string;
  domain: string;
  agentCost: number;
  creatorName: string;
}

interface Props {
  hub: Hub;
  onClose: () => void;
  onCreate: (agent: { name: string; subject: string; id?: number }) => void;
}

export default function HubAgentCreatorDialog({ hub, onClose, onCreate }: Props) {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [tone, setTone] = useState('patient');
  const [level, setLevel] = useState('Undergraduate');
  const [creating, setCreating] = useState(false);

  const creditBalance = user?.creditBalance ?? 0;
  const creationCost = hub.agentCost ?? 700;
  const canAfford = creditBalance >= creationCost;
  const trimmedName = name.trim();
  const previewName = trimmedName ? `${trimmedName} by ${hub.creatorName}` : '';
  const canSubmit = trimmedName.length > 0 && canAfford && !creating;

  const handleCreate = async () => {
    if (!trimmedName) {
      toast.error('Give your agent a name.');
      return;
    }
    if (!canAfford) {
      toast.error(`You need ${creationCost} credits. You have ${creditBalance}.`);
      return;
    }

    setCreating(true);
    try {
      const agent = await createAgent({
        name: trimmedName,
        subject: hub.title,
        level,
        tone,
        domain: hub.domain,
        personalityDescription: `Hub agent powered by the "${hub.title}" knowledge base curated by ${hub.creatorName}.`,
        learningHubId: hub.id,
      });

      if (!agent) {
        toast.error('Could not create the hub agent. Check your credits and subscription.');
        return;
      }

      await refreshProfile();
      toast.success(`"${agent.name}" is ready! ${creationCost} credits deducted.`);
      onCreate({ name: agent.name, subject: hub.title, id: agent.id });
      onClose();
    } catch {
      toast.error('Failed to create agent. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-background/70"
      />

      <div
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-elevation-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold">Hub agent</p>
              <p className="text-xs text-muted-foreground">{hub.title} · by {hub.creatorName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
              <Coins className="h-3 w-3" />
              <span>{creditBalance} credits</span>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" strokeWidth={1.5} />
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              Hub agents draw answers from <span className="text-foreground font-medium">{hub.creatorName}</span>'s
              curated knowledge base. They behave differently from regular agents — every reply is grounded in the
              hub's documents.
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Agent name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`e.g. ${hub.title} Tutor`}
              className="h-9 text-sm shadow-elevation-sm"
              autoFocus
              maxLength={48}
            />
            <p className="text-[10.5px] text-muted-foreground">
              Saved as: <span className="text-foreground font-medium">{previewName || `<name> by ${hub.creatorName}`}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Study level</Label>
            <div className="grid grid-cols-2 gap-2">
              {LEVELS.map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className={`text-xs px-3 py-2 rounded-lg border text-left transition-all ${level === l ? 'border-foreground bg-secondary font-medium shadow-elevation-sm' : 'border-border hover:border-foreground/30 hover:bg-secondary/50'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Teaching style</Label>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={`text-xs px-3 py-2 rounded-lg border text-left transition-all ${tone === t.value ? 'border-foreground bg-secondary font-medium shadow-elevation-sm' : 'border-border hover:border-foreground/30 hover:bg-secondary/50'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Cost</p>
            </div>
            <p className={`text-xs font-medium ${canAfford ? 'text-foreground' : 'text-destructive'}`}>
              {creationCost} credits
              {!canAfford && <span className="ml-1 text-[10px]">(have {creditBalance})</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 pb-6 pt-0">
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="text-xs h-8 gap-1.5 shadow-elevation-sm" onClick={handleCreate} disabled={!canSubmit}>
            {creating ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</>
            ) : (
              <>Create hub agent · {creationCost} cr</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
