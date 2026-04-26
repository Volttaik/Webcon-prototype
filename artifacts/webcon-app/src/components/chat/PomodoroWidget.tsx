import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Coffee, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

type Mode = 'focus' | 'break';

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PomodoroWidget({ open, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MIN * 60);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      return;
    }
    tickRef.current = window.setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          // Switch mode
          const nextMode: Mode = mode === 'focus' ? 'break' : 'focus';
          const nextSeconds = (nextMode === 'focus' ? FOCUS_MIN : BREAK_MIN) * 60;
          setMode(nextMode);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(nextMode === 'break' ? 'Focus done — take a break' : 'Break over — back to focus');
          }
          return nextSeconds;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [running, mode]);

  useEffect(() => {
    if (open && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }, [open]);

  const reset = () => {
    setRunning(false);
    setSecondsLeft((mode === 'focus' ? FOCUS_MIN : BREAK_MIN) * 60);
  };

  const totalSeconds = (mode === 'focus' ? FOCUS_MIN : BREAK_MIN) * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 right-4 z-50 w-[200px] rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-elevation-xl p-3"
          style={{ willChange: 'opacity, transform' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {mode === 'focus' ? (
                <Brain className="h-3 w-3 text-foreground/70" strokeWidth={1.5} />
              ) : (
                <Coffee className="h-3 w-3 text-emerald-400" strokeWidth={1.5} />
              )}
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                {mode === 'focus' ? 'Focus' : 'Break'}
              </span>
            </div>
            <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="text-center py-1.5">
            <div className="text-[28px] font-mono tabular-nums text-foreground/90 leading-none">
              {fmt(secondsLeft)}
            </div>
          </div>

          <div className="h-[3px] rounded-full bg-secondary/60 overflow-hidden mt-1.5 mb-3">
            <motion.div
              className={cn('h-full rounded-full', mode === 'focus' ? 'bg-foreground/70' : 'bg-emerald-400')}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRunning(r => !r)}
              className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg bg-foreground text-background text-[11px] font-medium hover:opacity-90 transition-opacity"
            >
              {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {running ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={reset}
              title="Reset"
              className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
