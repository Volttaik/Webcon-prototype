import { Loader2 } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Fimihub"
      className="min-h-screen bg-background flex items-center justify-center"
    >
      <Loader2
        className="h-10 w-10 text-foreground/70 animate-spin"
        strokeWidth={1.6}
      />
    </div>
  );
}
