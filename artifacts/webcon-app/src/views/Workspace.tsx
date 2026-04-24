import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Briefcase, Plus, Trash2, Pin, Search, BookOpen, Brain,
 FileText, StickyNote, Star, Clock, X, Download, FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppHeader from '@/components/layout/AppHeader';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type NoteColor = 'default' | 'yellow' | 'blue' | 'green' | 'pink';

interface Note {
 id: string;
 title: string;
 content: string;
 subject: string;
 pinned: boolean;
 starred: boolean;
 color: NoteColor;
 createdAt: Date;
}

const COLOR_MAP: Record<NoteColor, string> = {
 default: 'bg-card border-border',
 yellow: 'bg-card border-border',
 blue: 'bg-card border-border',
 green: 'bg-card border-border',
 pink: 'bg-card border-border',
};

const COLOR_ACCENT: Record<NoteColor, string> = {
 default: 'bg-secondary',
 yellow: 'bg-secondary',
 blue: 'bg-secondary',
 green: 'bg-secondary',
 pink: 'bg-secondary',
};

/* ─── Note full-view modal ─── */
function NoteModal({ note, onClose }: { note: Note; onClose: () => void }) {
 const printRef = useRef<HTMLDivElement>(null);

 const exportText = () => {
 const content = `${note.title}\n${'─'.repeat(note.title.length)}\nSubject: ${note.subject}\nDate: ${note.createdAt.toLocaleDateString()}\n\n${note.content}`;
 const blob = new Blob([content], { type: 'text/plain' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `${note.title.replace(/\s+/g, '_')}.txt`;
 a.click();
 URL.revokeObjectURL(url);
 toast('Exported as text file');
 };

 const exportPdf = () => {
 const win = window.open('', '_blank');
 if (!win) { toast.error('Please allow popups to export PDF'); return; }
 win.document.write(`<!DOCTYPE html><html><head>
 <title>${note.title}</title>
 <style>
 body { font-family: system-ui, -apple-system, sans-serif; max-width: 700px; margin: 40px auto; color: #1a1a1a; line-height: 1.7; }
 h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
 .meta { font-size: 12px; color: #888; margin-bottom: 28px; display: flex; gap: 16px; }
 pre { white-space: pre-wrap; font-size: 14px; }
 @media print { body { margin: 24px; } }
 </style>
 </head><body>
 <h1>${note.title}</h1>
 <div class="meta"><span>Subject: ${note.subject}</span><span>${note.createdAt.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
 <pre>${note.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
 </body></html>`);
 win.document.close();
 win.focus();
 setTimeout(() => { win.print(); }, 400);
 };

 return (
 <AnimatePresence>
 <motion.div
 key="modal-backdrop"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.18 }}
 onClick={onClose}
 className="fixed inset-0 z-50 bg-background/70"
 />
 <motion.div
 key="modal-content"
 initial={{ opacity: 0, scale: 0.96, y: 12 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.96, y: 12 }}
 transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
 className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
 >
 <div
 ref={printRef}
 onClick={e => e.stopPropagation()}
 className="pointer-events-auto w-full max-w-2xl max-h-[85vh] bg-background border border-border rounded-2xl shadow-elevation-xl flex flex-col overflow-hidden"
 >
 <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
 <div className="flex-1 min-w-0 pr-4">
 <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">{note.subject}</p>
 <h2 className="text-lg font-semibold leading-snug">{note.title}</h2>
 <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
 <Clock className="h-2.5 w-2.5" />
 {formatDistanceToNow(note.createdAt, { addSuffix: true })}
 </p>
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <Button
 variant="outline" size="sm"
 className="h-8 text-xs gap-1.5 shadow-elevation-sm"
 onClick={exportText}
 >
 <Download className="h-3.5 w-3.5" /> Text
 </Button>
 <Button
 variant="outline" size="sm"
 className="h-8 text-xs gap-1.5 shadow-elevation-sm"
 onClick={exportPdf}
 >
 <FileDown className="h-3.5 w-3.5" /> PDF
 </Button>
 <Button
 variant="ghost" size="icon"
 className="h-8 w-8 text-muted-foreground hover:text-foreground ml-1"
 onClick={onClose}
 >
 <X className="h-4 w-4" />
 </Button>
 </div>
 </div>
 <div className="flex-1 overflow-y-auto px-6 py-5">
 {note.content ? (
 <div className="text-[13px] text-foreground/85 leading-[1.8] whitespace-pre-wrap">
 {note.content}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <FileText className="h-8 w-8 text-muted-foreground/20 mb-3" strokeWidth={1} />
 <p className="text-sm text-muted-foreground">This note is empty</p>
 </div>
 )}
 </div>
 </div>
 </motion.div>
 </AnimatePresence>
 );
}

/* ─── Note card ─── */
function NoteCard({ note, onDelete, onTogglePin, onToggleStar, onClick }: {
 note: Note;
 onDelete: () => void;
 onTogglePin: () => void;
 onToggleStar: () => void;
 onClick: () => void;
}) {
 return (
 <motion.div
 layout
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.96 }}
 transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
 onClick={onClick}
 className={cn('border rounded-2xl p-4 shadow-elevation-sm hover:shadow-elevation-md transition-all group flex flex-col cursor-pointer', COLOR_MAP[note.color])}
 >
 <div className="flex items-center justify-between mb-2">
 <span className={cn('text-[10px] px-2 py-0.5 rounded-full border border-border font-medium text-muted-foreground', COLOR_ACCENT[note.color])}>
 {note.subject}
 </span>
 <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={e => { e.stopPropagation(); onToggleStar(); }}
 className={cn('p-1 rounded-lg hover:bg-secondary/60 transition-colors', note.starred ? 'text-foreground' : 'text-muted-foreground')}
 >
 <Star className={cn('h-3 w-3', note.starred && 'fill-current')} />
 </button>
 <button
 onClick={e => { e.stopPropagation(); onTogglePin(); }}
 className={cn('p-1 rounded-lg hover:bg-secondary/60 transition-colors', note.pinned ? 'text-foreground' : 'text-muted-foreground')}
 >
 <Pin className="h-3 w-3" />
 </button>
 <button
 onClick={e => { e.stopPropagation(); onDelete(); }}
 className="p-1 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-destructive"
 >
 <Trash2 className="h-3 w-3" />
 </button>
 </div>
 </div>

 <p className="text-[13px] font-semibold mb-2 leading-snug">{note.title}</p>

 <p className="text-[11px] text-muted-foreground leading-relaxed flex-1 line-clamp-5 whitespace-pre-line">
 {note.content || <span className="italic opacity-50">Empty note — click to open</span>}
 </p>

 <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/60">
 <Clock className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
 <span className="text-[10px] text-muted-foreground/50 flex-1">
 {formatDistanceToNow(note.createdAt, { addSuffix: true })}
 </span>
 {note.pinned && <Pin className="h-2.5 w-2.5 text-foreground/40" />}
 {note.starred && <Star className="h-2.5 w-2.5 text-foreground/40 fill-current" />}
 </div>
 </motion.div>
 );
}

const TOOLS = [
 { icon: StickyNote, label: 'Quick note', desc: 'Capture an idea fast' },
 { icon: FileText, label: 'Study guide', desc: 'Structured topic overview' },
 { icon: Brain, label: 'Ask agent', desc: 'Get help from AI' },
 { icon: BookOpen, label: 'Reading list', desc: 'Add to your queue' },
];

export default function Workspace() {
 const [notes, setNotes] = useState<Note[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [subject, setSubject] = useState('All');
 const [newTitle, setNewTitle] = useState('');
 const [newSubject, setNewSubject] = useState('');
 const [showNew, setShowNew] = useState(false);
 const [openNote, setOpenNote] = useState<Note | null>(null);

 useEffect(() => {
 fetch('/api/workspace')
 .then(r => r.ok ? r.json() : [])
 .then((items: { id: number; title: string; content: string; subject: string | null; pinned: boolean; starred: boolean; createdAt: string }[]) => {
 setNotes(items.map(i => ({
 id: String(i.id),
 title: i.title,
 content: i.content ?? '',
 subject: i.subject ?? 'General',
 pinned: i.pinned ?? false,
 starred: i.starred ?? false,
 color: 'default' as NoteColor,
 createdAt: new Date(i.createdAt),
 })));
 })
 .catch(() => {})
 .finally(() => setIsLoading(false));
 }, []);

 const subjects = ['All', ...Array.from(new Set(notes.map(n => n.subject))).sort()];

 const filtered = notes.filter(n => {
 const matchSubject = subject === 'All' || n.subject === subject;
 const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
 return matchSubject && matchSearch;
 });

 const pinned = filtered.filter(n => n.pinned);
 const rest = filtered.filter(n => !n.pinned);

 const addNote = async () => {
 if (!newTitle.trim()) return;
 const noteSubject = newSubject.trim() || (subject !== 'All' ? subject : 'General');
 try {
 const res = await fetch('/api/workspace', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ type: 'note', title: newTitle.trim(), content: '', subject: noteSubject }),
 });
 if (res.ok) {
 const item = await res.json();
 setNotes(prev => [{
 id: String(item.id),
 title: item.title,
 content: item.content ?? '',
 subject: item.subject ?? 'General',
 pinned: false, starred: false, color: 'default',
 createdAt: new Date(item.createdAt),
 }, ...prev]);
 setNewTitle('');
 setNewSubject('');
 setShowNew(false);
 toast('Note created');
 }
 } catch { toast.error('Failed to create note'); }
 };

 const togglePin = async (id: string) => {
 const note = notes.find(n => n.id === id);
 if (!note) return;
 const newPinned = !note.pinned;
 setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: newPinned } : n));
 await fetch(`/api/workspace/${id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ pinned: newPinned }),
 }).catch(() => setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !newPinned } : n)));
 };

 const toggleStar = async (id: string) => {
 const note = notes.find(n => n.id === id);
 if (!note) return;
 const newStarred = !note.starred;
 setNotes(prev => prev.map(n => n.id === id ? { ...n, starred: newStarred } : n));
 await fetch(`/api/workspace/${id}`, {
 method: 'PATCH',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ starred: newStarred }),
 }).catch(() => setNotes(prev => prev.map(n => n.id === id ? { ...n, starred: !newStarred } : n)));
 };

 const deleteNote = async (id: string) => {
 setNotes(prev => prev.filter(n => n.id !== id));
 if (openNote?.id === id) setOpenNote(null);
 await fetch(`/api/workspace/${id}`, { method: 'DELETE' })
 .catch(() => toast.error('Failed to delete note'));
 toast('Note deleted');
 };

 return (
 <div className="min-h-screen bg-background">
 <AppHeader />
 <Toaster />

 {openNote && (
 <NoteModal note={openNote} onClose={() => setOpenNote(null)} />
 )}

 <main className="pt-12">
 <div className="border-b border-border px-6 py-10">
 <div className="max-w-5xl mx-auto">
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
 <p className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-medium mb-1">Workspace</p>
 <h1 className="text-2xl font-semibold tracking-tight mb-5">Your study space</h1>

 <div className="flex flex-wrap gap-2 mb-5">
 {TOOLS.map(({ icon: Icon, label, desc }) => (
 <button
 key={label}
 onClick={() => { if (label === 'Quick note') setShowNew(true); else toast(`${label} — coming soon`); }}
 className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:border-foreground/20 hover:bg-secondary/40 transition-all shadow-elevation-sm text-left group"
 >
 <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" strokeWidth={1.5} />
 <div>
 <p className="text-[12px] font-medium leading-none">{label}</p>
 <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
 </div>
 </button>
 ))}
 </div>

 <div className="flex items-center gap-2 flex-wrap">
 <div className="relative flex-1 min-w-[180px] max-w-xs">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
 <Input
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Search notes…"
 className="pl-9 h-9 text-sm shadow-elevation-sm"
 />
 </div>
 {subjects.length > 1 && (
 <div className="flex items-center gap-1 flex-wrap">
 {subjects.map(s => (
 <button
 key={s}
 onClick={() => setSubject(s)}
 className={cn(
 'px-3 py-1.5 rounded-lg text-[12px] transition-all font-medium',
 subject === s
 ? 'bg-secondary border border-border text-foreground shadow-elevation-sm'
 : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
 )}
 >
 {s}
 </button>
 ))}
 </div>
 )}
 </div>
 </motion.div>
 </div>
 </div>

 <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

 <AnimatePresence>
 {showNew && (
 <motion.div
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 transition={{ duration: 0.22 }}
 className="overflow-hidden"
 >
 <div className="border border-border rounded-2xl p-4 bg-card shadow-elevation-md">
 <p className="text-[12px] font-medium text-muted-foreground mb-3">New note</p>
 <div className="flex gap-2 mb-2">
 <Input
 autoFocus
 value={newTitle}
 onChange={e => setNewTitle(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && addNote()}
 placeholder="Note title…"
 className="h-9 text-sm shadow-elevation-sm flex-1"
 />
 <Input
 value={newSubject}
 onChange={e => setNewSubject(e.target.value)}
 placeholder="Subject (optional)…"
 className="h-9 text-sm shadow-elevation-sm w-40"
 />
 </div>
 <div className="flex gap-2">
 <Button size="sm" className="h-9 text-xs px-4 shadow-elevation-sm" onClick={addNote}>Create</Button>
 <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setShowNew(false); setNewSubject(''); }}>Cancel</Button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {isLoading && (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {[1, 2, 3, 4, 5, 6].map(i => (
 <div key={i} className="border border-border rounded-2xl p-4 bg-card animate-pulse">
 <div className="h-3 w-16 bg-muted rounded-full mb-3" />
 <div className="h-4 w-3/4 bg-muted rounded mb-2" />
 <div className="space-y-1.5 mb-4">
 <div className="h-2.5 bg-muted rounded w-full" />
 <div className="h-2.5 bg-muted rounded w-5/6" />
 <div className="h-2.5 bg-muted rounded w-4/6" />
 </div>
 <div className="h-2.5 w-20 bg-muted rounded" />
 </div>
 ))}
 </div>
 )}

 {!isLoading && pinned.length > 0 && (
 <section>
 <div className="flex items-center gap-2 mb-3">
 <Pin className="h-3 w-3 text-muted-foreground" />
 <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pinned</p>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 <AnimatePresence>
 {pinned.map(n => (
 <NoteCard
 key={n.id} note={n}
 onDelete={() => deleteNote(n.id)}
 onTogglePin={() => togglePin(n.id)}
 onToggleStar={() => toggleStar(n.id)}
 onClick={() => setOpenNote(n)}
 />
 ))}
 </AnimatePresence>
 </div>
 </section>
 )}

 {!isLoading && rest.length > 0 && (
 <section>
 {pinned.length > 0 && (
 <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">All notes</p>
 )}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
 <AnimatePresence>
 {rest.map(n => (
 <NoteCard
 key={n.id} note={n}
 onDelete={() => deleteNote(n.id)}
 onTogglePin={() => togglePin(n.id)}
 onToggleStar={() => toggleStar(n.id)}
 onClick={() => setOpenNote(n)}
 />
 ))}
 </AnimatePresence>
 </div>
 </section>
 )}

 {!isLoading && filtered.length === 0 && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-dashed border-border/70 rounded-2xl p-12 text-center">
 <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1} />
 <p className="text-sm text-muted-foreground">No notes yet</p>
 <Button variant="outline" size="sm" className="mt-4 h-8 text-xs shadow-elevation-sm" onClick={() => setShowNew(true)}>
 <Plus className="h-3 w-3 mr-1.5" /> Create one
 </Button>
 </motion.div>
 )}
 </div>
 </main>
 </div>
 );
}
