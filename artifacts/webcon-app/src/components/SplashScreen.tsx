import { Brain } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-6">
        <div className="brain-tracer-outer w-20 h-20">
          <div className="brain-tracer-inner w-full h-full">
            <Brain className="h-9 w-9 text-foreground/80" strokeWidth={1.2} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium tracking-wide">Loading</span>
          <div className="flex items-center gap-1 ml-1">
            <span className="splash-dot block w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
            <span className="splash-dot block w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
            <span className="splash-dot block w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
