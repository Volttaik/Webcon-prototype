import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ['⌘', 'K'], desc: 'New chat' },
  { keys: ['⌘', 'F'], desc: 'Search messages in this chat' },
  { keys: ['⌘', '/'], desc: 'Show keyboard shortcuts' },
  { keys: ['/'], desc: 'Open slash commands menu (in input)' },
  { keys: ['↑'], desc: 'Edit last message (when input is empty)' },
  { keys: ['Enter'], desc: 'Send message' },
  { keys: ['Shift', 'Enter'], desc: 'Newline' },
  { keys: ['Esc'], desc: 'Close dialogs / cancel edit / clear search' },
];

export default function KeyboardShortcutsDialog({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-elevation-xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Keyboard shortcuts</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-muted-foreground">{s.desc}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {s.keys.map((k, j) => (
                      <kbd
                        key={j}
                        className="px-1.5 py-0.5 min-w-[20px] text-center text-[11px] font-mono rounded-md border border-border bg-secondary/60 text-foreground/80"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
