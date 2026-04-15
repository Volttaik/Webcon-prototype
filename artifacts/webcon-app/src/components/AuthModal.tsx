import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { X, Loader2, Camera, User, Mail, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  initialTab?: 'login' | 'register';
  onClose: () => void;
}

export default function AuthModal({ initialTab = 'login', onClose }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '', institution: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (tab === 'login') {
        const result = await login(form.email, form.password);
        if (result.error) {
          setError(result.error);
          return;
        }
        onClose();
        navigate('/chat');
      } else {
        if (!form.firstName || !form.lastName) {
          setError('First and last name are required');
          return;
        }
        const result = await register({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          institution: form.institution || undefined,
          avatarFile: avatarFile || undefined,
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.needsVerification) {
          setShowVerificationMessage(true);
          return;
        }
        onClose();
        navigate('/chat');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (showVerificationMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div
          className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-xl shadow-elevation-lg p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>

          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight mb-2">Check your email</h2>
            <p className="text-sm text-muted-foreground mb-4">
              We&apos;ve sent a verification link to <span className="font-medium text-foreground">{form.email}</span>
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Click the link in the email to verify your account and start learning with AI agents.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span>You&apos;ll receive 50 free credits after verification</span>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-4" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-xl shadow-elevation-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-semibold tracking-tight">
            {tab === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === 'login' ? "Sign in to your WebCon account" : "Start learning with AI agents today"}
          </p>
        </div>

        <div className="flex gap-1 mb-5 bg-muted rounded-lg p-1">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); setShowVerificationMessage(false); }}
              className={`flex-1 text-sm py-1.5 rounded-md transition-all font-medium ${tab === t ? 'bg-card shadow-elevation-sm text-foreground' : 'text-muted-foreground'}`}
            >
              {t === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'register' && (
            <>
              {/* Avatar Upload */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-full bg-secondary border-2 border-dashed border-border hover:border-foreground/30 flex items-center justify-center overflow-hidden transition-colors"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground/50" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center shadow-elevation-sm hover:bg-foreground/90 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground -mt-2 mb-3">
                Add a profile photo (optional)
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">First name</label>
                  <input value={form.firstName} onChange={set('firstName')} placeholder="Ada" required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Last name</label>
                  <input value={form.lastName} onChange={set('lastName')} placeholder="Okafor" required
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email address</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="ada@university.edu.ng" required
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required minLength={6}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          {tab === 'register' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">School / Institution <span className="text-muted-foreground/60">(optional)</span></label>
              <input value={form.institution} onChange={set('institution')} placeholder="University of Lagos"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}

          {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <Button type="submit" className="w-full h-9 shadow-elevation-sm" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tab === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        {tab === 'register' && (
          <p className="text-xs text-center text-muted-foreground mt-4">
            You&apos;ll receive a verification email with <span className="font-semibold text-foreground">50 free credits</span> after confirming.
          </p>
        )}
      </div>
    </div>
  );
}
