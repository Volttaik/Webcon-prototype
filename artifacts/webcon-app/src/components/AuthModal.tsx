import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { X, Loader2, Camera, User, Mail, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';

interface AuthModalProps {
 initialTab?: 'login' | 'register';
 onClose: () => void;
}

type View = 'login' | 'register' | 'forgot' | 'forgot-sent';

export default function AuthModal({ initialTab = 'login', onClose }: AuthModalProps) {
 const [view, setView] = useState<View>(initialTab);
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

 const [forgotEmail, setForgotEmail] = useState('');

 const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
  setForm((f) => ({ ...f, [k]: e.target.value }));

 const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
   if (file.size > 5 * 1024 * 1024) { setError('Image must be less than 5MB'); return; }
   setAvatarFile(file);
   const reader = new FileReader();
   reader.onloadend = () => setAvatarPreview(reader.result as string);
   reader.readAsDataURL(file);
  }
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);
  try {
   if (view === 'login') {
    const result = await login(form.email, form.password);
    if (result.error) { setError(result.error); return; }
    onClose();
    navigate('/chat');
   } else if (view === 'register') {
    if (!form.firstName || !form.lastName) { setError('First and last name are required'); return; }
    const result = await register({
     email: form.email, password: form.password,
     firstName: form.firstName, lastName: form.lastName,
     institution: form.institution || undefined,
     avatarFile: avatarFile || undefined,
    });
    if (result.error) { setError(result.error); return; }
    if (result.needsVerification) { setShowVerificationMessage(true); return; }
    onClose();
    navigate('/chat');
   }
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Something went wrong');
  } finally {
   setIsLoading(false);
  }
 };

 const handleForgotSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  if (!forgotEmail.trim()) { setError('Please enter your email address'); return; }
  setIsLoading(true);
  try {
   await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: forgotEmail.trim() }),
   });
   // Always show success (don't leak whether the email exists)
   setView('forgot-sent');
  } catch {
   setError('Network error. Please try again.');
  } finally {
   setIsLoading(false);
  }
 };

 // Email verification success screen (after register)
 if (showVerificationMessage) {
  return (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
    <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-xl shadow-elevation-lg p-6" onClick={(e) => e.stopPropagation()}>
     <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
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
     <Button variant="outline" className="w-full mt-4" onClick={onClose}>Close</Button>
    </div>
   </div>
  );
 }

 // Forgot password — email sent success screen
 if (view === 'forgot-sent') {
  return (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
    <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-xl shadow-elevation-lg p-6" onClick={(e) => e.stopPropagation()}>
     <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
     <div className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
       <Mail className="h-8 w-8 text-blue-400" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight mb-2">Check your email</h2>
      <p className="text-sm text-muted-foreground mb-4">
       If an account exists for <span className="font-medium text-foreground">{forgotEmail}</span>, we&apos;ve sent a reset link to it.
      </p>
      <p className="text-xs text-muted-foreground mb-6">
       The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
      </p>
     </div>
     <Button variant="outline" className="w-full mt-2" onClick={() => { setView('login'); setError(''); }}>
      Back to sign in
     </Button>
    </div>
   </div>
  );
 }

 // Forgot password — email input screen
 if (view === 'forgot') {
  return (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
    <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-xl shadow-elevation-lg p-6" onClick={(e) => e.stopPropagation()}>
     <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>

     <button
      onClick={() => { setView('login'); setError(''); }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
     >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
     </button>

     <div className="mb-6">
      <h2 className="text-lg font-semibold tracking-tight">Forgot your password?</h2>
      <p className="text-sm text-muted-foreground mt-1">
       Enter your email and we&apos;ll send you a reset link.
      </p>
     </div>

     <form onSubmit={handleForgotSubmit} className="space-y-3">
      <div>
       <label className="text-xs text-muted-foreground mb-1 block">Email address</label>
       <input
        type="email"
        value={forgotEmail}
        onChange={e => setForgotEmail(e.target.value)}
        placeholder="ada@university.edu.ng"
        required
        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
       />
      </div>

      {error && (
       <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
       </div>
      )}

      <Button type="submit" className="w-full h-9 shadow-elevation-sm" disabled={isLoading}>
       {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
      </Button>
     </form>
    </div>
   </div>
  );
 }

 // Main login / register form
 return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
   <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-xl shadow-elevation-lg p-6" onClick={(e) => e.stopPropagation()}>
    <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>

    <div className="mb-6">
     <h2 className="text-lg font-semibold tracking-tight">
      {view === 'login' ? 'Welcome back' : 'Create your account'}
     </h2>
     <p className="text-sm text-muted-foreground mt-1">
      {view === 'login' ? "Sign in to your EduBridge account" : "Start learning with AI agents today"}
     </p>
    </div>

    <div className="flex gap-1 mb-5 bg-muted rounded-lg p-1">
     {(['login', 'register'] as const).map((t) => (
      <button
       key={t}
       onClick={() => { setView(t); setError(''); setShowVerificationMessage(false); }}
       className={`flex-1 text-sm py-1.5 rounded-md transition-all font-medium ${view === t ? 'bg-card shadow-elevation-sm text-foreground' : 'text-muted-foreground'}`}
      >
       {t === 'login' ? 'Sign in' : 'Register'}
      </button>
     ))}
    </div>

    <form onSubmit={handleSubmit} className="space-y-3">
     {view === 'register' && (
      <>
       <div className="flex justify-center mb-4">
        <div className="relative">
         <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
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
       <p className="text-xs text-center text-muted-foreground -mt-2 mb-3">Add a profile photo (optional)</p>
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
      <div className="flex items-center justify-between mb-1">
       <label className="text-xs text-muted-foreground">Password</label>
       {view === 'login' && (
        <button
         type="button"
         onClick={() => { setView('forgot'); setForgotEmail(form.email); setError(''); }}
         className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
         Forgot password?
        </button>
       )}
      </div>
      <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required minLength={6}
       className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
     </div>

     {view === 'register' && (
      <div>
       <label className="text-xs text-muted-foreground mb-1 block">School / Institution <span className="text-muted-foreground/60">(optional)</span></label>
       <input value={form.institution} onChange={set('institution')} placeholder="University of Lagos"
        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
     )}

     {error && <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

     <Button type="submit" className="w-full h-9 shadow-elevation-sm" disabled={isLoading}>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : view === 'login' ? 'Sign in' : 'Create account'}
     </Button>
    </form>

    {view === 'register' && (
     <p className="text-xs text-center text-muted-foreground mt-4">
      You&apos;ll receive a verification email with <span className="font-semibold text-foreground">50 free credits</span> after confirming.
     </p>
    )}
   </div>
  </div>
 );
}
