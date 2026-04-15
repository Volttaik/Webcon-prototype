import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, BookOpen, ChevronRight, Coins, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { createAgent } from '@/lib/data-service';

const SUBJECTS = [
  'Biology', 'Chemistry', 'Physics', 'Mathematics',
  'History', 'Literature', 'Economics', 'Psychology',
  'Computer Science', 'Philosophy', 'Geography', 'Art History',
  'Business', 'Law', 'Medicine', 'Engineering',
];

const LEVELS = ['High School', 'Undergraduate', 'Graduate', 'Self-study'];

const DOMAINS = [
  { value: 'education', label: 'Education', desc: 'Teaching, tutoring, and learning support' },
  { value: 'research', label: 'Research', desc: 'In-depth analysis and knowledge synthesis' },
  { value: 'business', label: 'Business', desc: 'Strategy, analysis, and professional advice' },
  { value: 'general', label: 'General', desc: 'Versatile, multi-purpose assistant' },
];

const TONES = [
  { value: 'patient', label: 'Patient & thorough', desc: 'Step-by-step explanations with lots of examples' },
  { value: 'concise', label: 'Concise & direct', desc: 'Get to the point, minimal fluff' },
  { value: 'socratic', label: 'Socratic', desc: 'Guides you to answers with probing questions' },
  { value: 'friendly', label: 'Friendly & warm', desc: 'Conversational, casual, and encouraging' },
  { value: 'strict', label: 'Strict & rigorous', desc: 'High standards, precise, demands accuracy' },
  { value: 'motivational', label: 'Motivational', desc: 'Energetic, uplifting, and action-oriented' },
];

const PERSONALITY_TEMPLATES = [
  { label: 'Professor', value: 'Calm, very detailed, explains like a professor, uses examples and real-world analogies, encourages critical thinking' },
  { label: 'Doctor', value: 'Methodical, evidence-based, thorough, always considers multiple perspectives, uses clear clinical reasoning' },
  { label: 'Business Advisor', value: 'Strategic, results-focused, uses business frameworks, pragmatic, balances analysis with actionable advice' },
  { label: 'General Assistant', value: 'Helpful, adaptable, versatile, clear communicator, responsive to the user\'s needs and style' },
];

const AGENT_COST = 100;

interface Props {
  onClose: () => void;
  onCreate: (agent: { name: string; subject: string; id?: number }) => void;
  firstAgentFree?: boolean;
}

export default function AgentCreatorDialog({ onClose, onCreate, firstAgentFree = false }: Props) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [tone, setTone] = useState('patient');
  const [domain, setDomain] = useState('education');
  const [personalityDescription, setPersonalityDescription] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [creating, setCreating] = useState(false);

  const resolvedSubject = subject === 'other' ? customSubject : subject;
  const canProceed1 = resolvedSubject.trim().length > 0;
  const canProceed2 = name.trim().length > 0 && level.length > 0;
  const canProceed3 = domain.length > 0;

  const creditBalance = user?.creditBalance ?? 0;
  const creationCost = firstAgentFree ? 0 : AGENT_COST;
  const canAfford = creationCost === 0 || creditBalance >= creationCost;

  const handleCreate = async () => {
    if (!canAfford) {
      toast.error(`You need ${creationCost} credits to create an agent. You have ${creditBalance}.`);
      return;
    }

    setCreating(true);
    try {
      const agent = await createAgent({
        name: name.trim(),
        subject: resolvedSubject,
        level,
        tone,
        domain,
        personalityDescription,
        skipCredits: firstAgentFree,
      });

      if (!agent) {
        toast.error('Failed to create agent. Check your credits.');
        return;
      }

      await refreshProfile();
      toast.success(firstAgentFree ? `Your first free agent "${name}" is ready!` : `Agent "${name}" created! ${creationCost} credits deducted.`);
      onCreate({ name: name.trim(), subject: resolvedSubject, id: agent.id });
      onClose();
    } catch {
      toast.error('Failed to create agent. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-elevation-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <Brain className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold">{firstAgentFree ? 'Create your first free agent' : 'Create new agent'}</p>
              <p className="text-xs text-muted-foreground">Step {step} of 4</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground border border-border rounded-full px-2 py-0.5">
              <Coins className="h-3 w-3" />
              <span>{creditBalance} credits</span>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map(s => (
              <motion.div key={s} className="h-1 flex-1 rounded-full overflow-hidden bg-secondary border border-border">
                <motion.div
                  className="h-full bg-foreground rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: step >= s ? '100%' : '0%' }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="px-6 py-6 min-h-[300px] max-h-[420px] overflow-y-auto">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <p className="text-sm font-medium mb-1">What subject is this agent for?</p>
                <p className="text-xs text-muted-foreground mb-5">Choose the course or topic your agent will specialize in.</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {SUBJECTS.map(s => (
                    <button key={s} onClick={() => setSubject(s)}
                      className={`text-xs px-2 py-2 rounded-lg border transition-all text-left ${subject === s ? 'border-foreground bg-secondary font-medium shadow-elevation-sm' : 'border-border hover:border-foreground/30 hover:bg-secondary/50'}`}>
                      {s}
                    </button>
                  ))}
                  <button onClick={() => setSubject('other')}
                    className={`text-xs px-2 py-2 rounded-lg border transition-all text-left ${subject === 'other' ? 'border-foreground bg-secondary font-medium shadow-elevation-sm' : 'border-border hover:border-foreground/30 hover:bg-secondary/50'}`}>
                    Other…
                  </button>
                </div>
                {subject === 'other' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <Input value={customSubject} onChange={e => setCustomSubject(e.target.value)} placeholder="e.g. Organic Chemistry Lab" className="h-9 text-sm" autoFocus />
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <p className="text-sm font-medium mb-1">Name your agent</p>
                <p className="text-xs text-muted-foreground mb-5">Give it a name and select your study level.</p>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Agent name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)}
                      placeholder={`e.g. ${resolvedSubject} Agent`}
                      className="h-9 text-sm shadow-elevation-sm" autoFocus />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Study level</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {LEVELS.map(l => (
                        <button key={l} onClick={() => setLevel(l)}
                          className={`text-xs px-3 py-2 rounded-lg border text-left transition-all ${level === l ? 'border-foreground bg-secondary font-medium shadow-elevation-sm' : 'border-border hover:border-foreground/30 hover:bg-secondary/50'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <p className="text-sm font-medium mb-1">Choose domain & personality</p>
                <p className="text-xs text-muted-foreground mb-4">Define how your agent thinks and behaves.</p>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs mb-2 block">Domain</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DOMAINS.map(d => (
                        <button key={d.value} onClick={() => setDomain(d.value)}
                          className={`text-left p-3 rounded-xl border transition-all ${domain === d.value ? 'border-foreground bg-secondary shadow-elevation-sm' : 'border-border hover:border-foreground/25 hover:bg-secondary/40'}`}>
                          <p className="text-xs font-medium">{d.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{d.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-2 block">Teaching style</Label>
                    <div className="space-y-1.5">
                      {TONES.map(t => (
                        <button key={t.value} onClick={() => setTone(t.value)}
                          className={`w-full flex items-start gap-3 px-4 py-2.5 rounded-xl border text-left transition-all ${tone === t.value ? 'border-foreground bg-secondary shadow-elevation-sm' : 'border-border hover:border-foreground/25 hover:bg-secondary/40'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 shrink-0 transition-colors ${tone === t.value ? 'border-foreground bg-foreground' : 'border-border'}`} />
                          <div>
                            <p className="text-xs font-medium">{t.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <p className="text-sm font-medium mb-1">Personality description</p>
                <p className="text-xs text-muted-foreground mb-4">Describe your agent's personality. This becomes its soul — defining how it thinks, talks, and behaves uniquely.</p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {PERSONALITY_TEMPLATES.map(t => (
                    <button key={t.label} onClick={() => setPersonalityDescription(t.value)}
                      className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${personalityDescription === t.value ? 'border-foreground bg-secondary font-medium shadow-elevation-sm' : 'border-border hover:border-foreground/25 hover:bg-secondary/40'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={personalityDescription}
                  onChange={e => setPersonalityDescription(e.target.value)}
                  placeholder="e.g. Calm, very detailed, explains like a professor, uses real-world examples and analogies, encourages critical thinking…"
                  className="w-full h-24 rounded-xl border border-border bg-background px-3 py-2.5 text-xs resize-none focus:outline-none focus:border-foreground/30 transition-colors shadow-elevation-sm"
                />

                <div className="mt-5 p-4 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium">Agent summary</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{name} · {resolvedSubject} · {level} · {domain}</p>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                    <Coins className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Cost: <span className={canAfford ? 'text-foreground font-medium' : 'text-destructive font-medium'}>{firstAgentFree ? 'Free' : `${creationCost} credits`}</span>
                      {!canAfford && <span className="ml-1">(insufficient — you have {creditBalance})</span>}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between px-6 pb-6 pt-0">
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 4 ? (
            <Button size="sm" className="text-xs h-8 gap-1.5 shadow-elevation-sm" onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !canProceed1 : step === 2 ? !canProceed2 : !canProceed3}>
              Continue <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" className="text-xs h-8 gap-1.5 shadow-elevation-sm" onClick={handleCreate}
              disabled={creating || !canAfford}>
              {creating ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</>
              ) : (
                <>{firstAgentFree ? 'Create free agent' : `Create agent · ${creationCost} credits`}</>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
