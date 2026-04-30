import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'edubridge:install-dismissed-at';
const DISMISS_HOURS = 24;

function isStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari
  return Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);
}

function isIos() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !/crios|fxios/i.test(window.navigator.userAgent);
}

export default function InstallAppPrompt() {
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    setIos(isIos());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show immediately on entry unless recently dismissed
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || '0');
    } catch {
      dismissedAt = 0;
    }
    const hoursSince = (Date.now() - dismissedAt) / (1000 * 60 * 60);
    if (hoursSince > DISMISS_HOURS) {
      setOpen(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function close() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    setOpen(false);
  }

  async function install() {
    if (!deferred) {
      // Fallback for browsers that don't fire the event (iOS, etc.)
      close();
      return;
    }
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* noop */
    }
    setDeferred(null);
    close();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-app-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card shadow-elevation-md p-6 sm:p-7">
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-elevation-sm">
            <Smartphone className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <div>
            <p id="install-app-title" className="text-base font-semibold tracking-tight">
              Install EduBridge
            </p>
            <p className="text-xs text-muted-foreground">
              Faster, smoother and works offline.
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          Add EduBridge to your home screen to get instant access to the marketplace, chats and orders — without opening a browser.
        </p>

        {ios ? (
          <div className="rounded-2xl border border-border bg-secondary/60 p-4 text-xs text-muted-foreground leading-relaxed mb-5">
            <p className="text-foreground font-medium mb-1.5">On iPhone:</p>
            <p>
              Tap the <Share2 className="inline h-3.5 w-3.5 mx-0.5 align-text-bottom" /> Share button in Safari, then choose
              <span className="text-foreground font-medium"> Add to Home Screen</span>.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button variant="ghost" size="sm" className="h-10 text-sm" onClick={close}>
            Maybe later
          </Button>
          <Button size="sm" className="h-10 text-sm gap-2" onClick={install}>
            <Download className="h-4 w-4" />
            Install app
          </Button>
        </div>
      </div>
    </div>
  );
}
