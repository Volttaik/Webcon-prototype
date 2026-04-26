import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, BellOff, Check, CheckCheck, Crown, Zap, X, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  pushIsSupported,
  getNotificationPermission,
  getActivePushSubscription,
  enablePushNotifications,
  disablePushNotifications,
} from "@/lib/push-client";

type Notification = {
  id: number;
  type: string;
  title: string;
  body: string;
  icon: string | null;
  href: string | null;
  meta: string | null;
  read: boolean;
  createdAt: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  zap: Zap,
  crown: Crown,
  sparkles: Sparkles,
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [pushState, setPushState] = useState<"unsupported" | "default" | "granted" | "denied" | "unknown">("unknown");
  const [enabling, setEnabling] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Initial state probe + listen for permission changes
  useEffect(() => {
    if (!pushIsSupported()) {
      setPushState("unsupported");
      return;
    }
    setPushState(getNotificationPermission() as typeof pushState);
  }, []);

  // Poll notifications when signed in
  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json() as { items: Notification[]; unreadCount: number };
        if (!cancelled) {
          setItems(data.items || []);
          setUnread(data.unreadCount || 0);
        }
      } catch { /* noop */ }
    };
    load();
    const int = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(int); };
  }, [user]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const markRead = async (id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
    } catch { /* noop */ }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
    } catch { /* noop */ }
  };

  const clickItem = async (n: Notification) => {
    if (!n.read) await markRead(n.id);
    if (n.href) {
      setOpen(false);
      navigate(n.href);
    }
  };

  const togglePush = async () => {
    if (enabling) return;
    setEnabling(true);
    try {
      if (pushState === "granted") {
        const sub = await getActivePushSubscription();
        if (sub) {
          await disablePushNotifications();
          setPushState("default");
        } else {
          const r = await enablePushNotifications();
          if (r.ok) setPushState("granted");
        }
      } else {
        const r = await enablePushNotifications();
        if (r.ok) setPushState("granted");
        else if (r.reason === "denied") setPushState("denied");
      }
    } finally {
      setEnabling(false);
    }
  };

  if (!user) return null;

  const showEnableBanner = pushState === "default";
  const pushOn = pushState === "granted";

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors",
          open && "text-foreground bg-secondary/60"
        )}
        aria-label="Notifications"
      >
        {unread > 0 ? <BellRing className="h-3.5 w-3.5" strokeWidth={1.7} /> : <Bell className="h-3.5 w-3.5" strokeWidth={1.7} />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <>
        {open && (
          <div
            className="absolute right-0 top-10 z-50 w-[340px] sm:w-[380px] max-w-[calc(100vw-1.5rem)] bg-background border border-border rounded-2xl shadow-elevation-lg overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight">Notifications</span>
                {unread > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                    {unread} new
                  </span>
                )}
              </div>
              {items.some((n) => !n.read) && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Enable push banner */}
            {showEnableBanner && (
              <div className="mx-3 mt-3 mb-1 p-3 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-indigo-500/5">
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <BellRing className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium leading-tight">Get instant updates on your phone</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      Install EduBridge to your home screen, then turn on push to hear about credits, plans, and activity.
                    </p>
                    <button
                      onClick={togglePush}
                      disabled={enabling}
                      className="mt-2 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-violet-500 text-white hover:bg-violet-400 transition-colors disabled:opacity-60"
                    >
                      {enabling ? "Enabling…" : "Turn on push"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pushState === "denied" && (
              <div className="mx-3 mt-3 mb-1 p-3 rounded-xl border border-amber-500/25 bg-amber-500/5">
                <div className="flex items-start gap-2.5">
                  <BellOff className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11.5px] text-muted-foreground leading-snug">
                    Push is blocked for this site. Open browser settings → Site settings → Notifications to allow EduBridge.
                  </p>
                </div>
              </div>
            )}

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-10 px-6 text-center">
                  <div className="h-10 w-10 mx-auto rounded-full bg-secondary/60 flex items-center justify-center mb-2">
                    <Bell className="h-4 w-4 text-muted-foreground/60" />
                  </div>
                  <p className="text-[12.5px] font-medium">You're all caught up</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">New activity will land here.</p>
                </div>
              ) : (
                <ul className="py-1">
                  {items.map((n) => {
                    const Icon = (n.icon && ICON_MAP[n.icon]) || Bell;
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => clickItem(n)}
                          className={cn(
                            "group w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-secondary/40 transition-colors",
                            !n.read && "bg-secondary/20"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                            n.type === "credits_purchase" && "bg-emerald-500/15 text-emerald-400",
                            n.type === "plan_upgrade" && "bg-violet-500/15 text-violet-400",
                            !["credits_purchase", "plan_upgrade"].includes(n.type) && "bg-secondary text-muted-foreground"
                          )}>
                            <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={cn("text-[12.5px] truncate", !n.read ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>
                                {n.title}
                              </p>
                              {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />}
                            </div>
                            <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                            <p className="text-[10.5px] text-muted-foreground/60 mt-1">{formatRelative(n.createdAt)}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
              <button
                onClick={togglePush}
                disabled={enabling || pushState === "unsupported"}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {pushOn ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    Push notifications on
                  </>
                ) : pushState === "unsupported" ? (
                  <>
                    <BellOff className="h-3 w-3" />
                    Push not supported here
                  </>
                ) : (
                  <>
                    <Bell className="h-3 w-3" />
                    Turn on push
                  </>
                )}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </>
    </div>
  );
}
