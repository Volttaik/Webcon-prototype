import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Calendar, MapPin, GraduationCap, FileText, Upload,
  BookOpen, ChevronRight, ChevronLeft, Loader2, AlertCircle, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppHeader from '@/components/layout/AppHeader';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
];

const DOMAINS = [
  { value: 'science', label: 'Science & Technology' },
  { value: 'arts', label: 'Arts & Humanities' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'medicine', label: 'Medicine & Health' },
  { value: 'law', label: 'Law' },
  { value: 'business', label: 'Business & Economics' },
  { value: 'education', label: 'Education' },
  { value: 'social-sciences', label: 'Social Sciences' },
  { value: 'general', label: 'General / Other' },
];

const EXPERTISE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const TARGET_LEVELS = ['100 Level', '200 Level', '300 Level', '400 Level', 'Final Year', 'Postgraduate', 'All Levels'];
const DEGREE_STATUS = ['Student (Undergraduate)', 'Student (Postgraduate)', 'Graduate', 'Lecturer/Researcher', 'Professional'];

const STEPS = ['Personal Info', 'Academic', 'Documents', 'Hub Details', 'Review & Submit'];

type FormData = {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  gmailAddress: string;
  state: string;
  university: string;
  degreeStatus: string;
  nin: string;
  fieldOfStudy: string;
  expertiseLevel: string;
  targetLevel: string;
  hubTitle: string;
  hubDescription: string;
  hubDomain: string;
  passportPhotoUrl: string;
  degreeEvidenceUrl: string;
  studentEvidenceUrl: string;
};

async function uploadFile(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', 'hub-documents');
  formData.append('folder', folder);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  const data = await res.json();
  return data.url;
}

export default function LearningHubApply() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const [form, setForm] = useState<FormData>({
    fullName: '', gender: '', dateOfBirth: '', gmailAddress: '',
    state: '', university: '', degreeStatus: '', nin: '',
    fieldOfStudy: '', expertiseLevel: '', targetLevel: '',
    hubTitle: '', hubDescription: '', hubDomain: 'general',
    passportPhotoUrl: '', degreeEvidenceUrl: '', studentEvidenceUrl: '',
  });

  const set = (key: keyof FormData, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormData, folder: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    try {
      const url = await uploadFile(file, folder);
      set(field, url);
      toast.success('File uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadingField(null);
    }
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.fullName.trim()) return 'Full name is required';
      if (!form.gender) return 'Gender is required';
      if (!form.dateOfBirth) return 'Date of birth is required';
      if (!form.gmailAddress.trim() || !form.gmailAddress.includes('@gmail.com')) return 'Valid Gmail address is required';
      if (!form.state) return 'State is required';
    }
    if (s === 1) {
      if (!form.university.trim()) return 'University is required';
      if (!form.degreeStatus) return 'Degree status is required';
      if (!form.nin.trim() || form.nin.length < 11) return 'Valid NIN is required (11 digits)';
      if (!form.fieldOfStudy.trim()) return 'Field of study is required';
      if (!form.expertiseLevel) return 'Expertise level is required';
      if (!form.targetLevel) return 'Target level is required';
    }
    if (s === 2) {
      if (!form.passportPhotoUrl) return 'Passport photograph is required';
    }
    if (s === 3) {
      if (!form.hubTitle.trim() || form.hubTitle.trim().length < 5) return 'Hub title must be at least 5 characters';
      if (!form.hubDomain) return 'Domain is required';
    }
    if (s === 4) {
      if (!agreed) return 'You must agree to the content authenticity rules';
    }
    return null;
  };

  const nextStep = () => {
    const error = validateStep(step);
    if (error) { toast.error(error); return; }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const prevStep = () => { if (step > 0) setStep(s => s - 1); };

  const handleSubmit = async () => {
    const error = validateStep(4);
    if (error) { toast.error(error); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/learning-hubs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Submission failed');
        return;
      }
      toast.success('Application submitted! Check your email for your dashboard link.');
      setTimeout(() => navigate('/learning-hub'), 2000);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fadeSlide = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <Toaster />
      <main className="pt-12">
        <div className="border-b border-border px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">Learning Hub</p>
            <h1 className="text-xl font-semibold tracking-tight mb-2">Creator Verification</h1>
            <p className="text-sm text-muted-foreground">Complete this form to create your Learning Hub. All submissions are reviewed for authenticity.</p>

            <div className="flex items-center gap-1 mt-6">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-medium border transition-all',
                    i < step ? 'bg-foreground text-background border-foreground' :
                    i === step ? 'border-foreground text-foreground' :
                    'border-border text-muted-foreground'
                  )}>
                    {i < step ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={cn('text-[10px] hidden sm:block', i === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>{s}</span>
                  {i < STEPS.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" {...fadeSlide} className="space-y-4">
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">Personal Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Full Name *</Label>
                    <Input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="As on your ID" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Gender *</Label>
                    <select value={form.gender} onChange={e => set('gender', e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="">Select gender</option>
                      <option>Male</option><option>Female</option><option>Prefer not to say</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date of Birth *</Label>
                    <Input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Gmail Address *</Label>
                    <Input type="email" value={form.gmailAddress} onChange={e => set('gmailAddress', e.target.value)} placeholder="yourname@gmail.com" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">State of Origin *</Label>
                    <select value={form.state} onChange={e => set('state', e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" {...fadeSlide} className="space-y-4">
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">Academic Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">University / Institution *</Label>
                    <Input value={form.university} onChange={e => set('university', e.target.value)} placeholder="e.g. University of Lagos" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Academic Status *</Label>
                    <select value={form.degreeStatus} onChange={e => set('degreeStatus', e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="">Select status</option>
                      {DEGREE_STATUS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">NIN (National Identity Number) *</Label>
                    <Input value={form.nin} onChange={e => set('nin', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11-digit NIN" maxLength={11} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Field of Study *</Label>
                    <Input value={form.fieldOfStudy} onChange={e => set('fieldOfStudy', e.target.value)} placeholder="e.g. Computer Science, Medicine, Law" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Self-assessed Expertise *</Label>
                    <select value={form.expertiseLevel} onChange={e => set('expertiseLevel', e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="">Select level</option>
                      {EXPERTISE_LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Target Academic Level *</Label>
                    <select value={form.targetLevel} onChange={e => set('targetLevel', e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                      <option value="">Select level</option>
                      {TARGET_LEVELS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" {...fadeSlide} className="space-y-5">
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">Document Uploads</h2>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Documents are stored securely and reviewed by our team. Fake or misleading documents will result in permanent account ban.
                  </p>
                </div>

                {[
                  { label: 'Passport Photograph *', field: 'passportPhotoUrl' as const, folder: 'passport', required: true },
                  { label: 'Evidence of Degree/Certificate (Graduates)', field: 'degreeEvidenceUrl' as const, folder: 'degree', required: false },
                  { label: 'Evidence of Student Status (Students)', field: 'studentEvidenceUrl' as const, folder: 'student-id', required: false },
                ].map(({ label, field, folder, required }) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <div className={cn(
                      'border-2 border-dashed rounded-xl p-5 text-center transition-colors',
                      form[field] ? 'border-green-500/40 bg-green-500/5' : 'border-border hover:border-foreground/20'
                    )}>
                      {form[field] ? (
                        <div className="flex items-center justify-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">Uploaded successfully</span>
                          <button onClick={() => set(field, '')} className="text-[11px] text-muted-foreground underline ml-2">Remove</button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" strokeWidth={1} />
                          <p className="text-xs text-muted-foreground mb-2">Click to upload JPG or PNG</p>
                          <label className="cursor-pointer">
                            <span className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-secondary/50 transition-colors">
                              {uploadingField === field ? <Loader2 className="h-3 w-3 animate-spin inline" /> : 'Choose file'}
                            </span>
                            <input type="file" accept="image/jpeg,image/jpg,image/png" className="hidden"
                              onChange={e => handleFileUpload(e, field, folder)} disabled={uploadingField === field} />
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" {...fadeSlide} className="space-y-4">
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">Hub Details</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hub Title *</Label>
                    <Input value={form.hubTitle} onChange={e => set('hubTitle', e.target.value)} placeholder="e.g. Advanced Organic Chemistry Hub" />
                    <p className="text-[11px] text-muted-foreground">Must be clear, educational, and unique.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <textarea
                      value={form.hubDescription}
                      onChange={e => set('hubDescription', e.target.value)}
                      placeholder="Brief description of what this hub covers..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Domain *</Label>
                    <select value={form.hubDomain} onChange={e => set('hubDomain', e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
                      {DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" {...fadeSlide} className="space-y-5">
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider">Review & Submit</h2>

                <div className="border border-border rounded-xl divide-y divide-border text-sm">
                  {[
                    { label: 'Full Name', value: form.fullName },
                    { label: 'Gmail', value: form.gmailAddress },
                    { label: 'University', value: form.university },
                    { label: 'Field of Study', value: form.fieldOfStudy },
                    { label: 'Hub Title', value: form.hubTitle },
                    { label: 'Domain', value: form.hubDomain },
                    { label: 'Expertise', value: form.expertiseLevel },
                    { label: 'Target Level', value: form.targetLevel },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between px-4 py-2.5">
                      <span className="text-muted-foreground text-xs">{label}</span>
                      <span className="text-xs font-medium max-w-[60%] text-right truncate">{value || '—'}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border p-4 bg-secondary/20 space-y-3">
                  <h3 className="text-xs font-semibold">Content Authenticity Agreement</h3>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {[
                      'I will only add knowledge I have personally written or typed',
                      'I will not paste text copied from external sources or documents',
                      'I will not upload pre-written documents',
                      'I understand that fake content will result in permanent account ban',
                      'I agree that submitted information is truthful to the best of my knowledge',
                    ].map((rule, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-muted-foreground/40 shrink-0 mt-0.5">•</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                  <label className="flex items-center gap-2 cursor-pointer mt-3">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-4 h-4" />
                    <span className="text-xs font-medium">I agree to all content authenticity rules</span>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button variant="outline" size="sm" onClick={prevStep} disabled={step === 0} className="gap-1.5">
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={nextStep} className="gap-1.5">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !agreed} className="gap-1.5 min-w-[120px]">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Submit Application'}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
