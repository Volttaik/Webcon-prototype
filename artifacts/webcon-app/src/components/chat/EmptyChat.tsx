import { motion } from 'framer-motion';
import { BookOpen, Brain, FlaskConical, Code2, Landmark, Calculator } from 'lucide-react';
import MessageInput from './MessageInput';
import { Logo } from '@/components/Logo';

const suggestions = [
  { icon: FlaskConical, label: 'Explain a concept',  prompt: 'Explain the Krebs cycle and how it connects to ATP production' },
  { icon: Calculator,   label: 'Solve step-by-step', prompt: 'Walk me through solving an integral using integration by parts' },
  { icon: BookOpen,     label: 'Study summary',       prompt: 'Give me a concise summary of the key themes in Macbeth' },
  { icon: Brain,        label: 'Quiz me',              prompt: 'Quiz me on the causes and effects of World War I' },
  { icon: Code2,        label: 'Debug my code',        prompt: 'Help me understand why my recursive function has infinite recursion' },
  { icon: Landmark,     label: 'Essay outline',        prompt: 'Help me outline an argumentative essay on climate policy' },
];

export default function EmptyChat({ onSend }: { onSend: (msg: string) => void }) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-12 relative z-10">

        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.75 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-11 h-11 rounded-2xl bg-foreground flex items-center justify-center mb-5 shadow-elevation-xl text-background"
        >
          <Logo className="h-5 w-5" strokeWidth={1.7} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-lg font-semibold tracking-tight mb-1.5"
        >
          How can I help you study?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-[13px] text-muted-foreground mb-8 text-center max-w-sm leading-relaxed"
        >
          Ask me to explain concepts, quiz you, help with homework, or break down anything you're struggling with.
        </motion.p>

        {/* Suggestion chips */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full max-w-xl">
          {suggestions.map(({ icon: Icon, label, prompt }, i) => (
            <motion.button
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 + i * 0.045, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSend(prompt)}
              className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl hover:border-foreground/20 hover:bg-secondary/40 transition-all duration-150 text-left elevated-surface hover:shadow-elevation-lg"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" strokeWidth={1.5} />
              <span className="text-[12.5px] text-muted-foreground leading-tight">{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-border/70 bg-background/95 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-md shadow-elevation-md">
        <MessageInput onSend={onSend} />
      </div>
    </div>
  );
}
