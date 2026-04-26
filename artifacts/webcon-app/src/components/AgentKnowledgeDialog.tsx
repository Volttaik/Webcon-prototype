import { useEffect, useRef, useState } from 'react';
import { X, FileText, Trash2, Loader2, Upload, BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface AgentFile {
  id: number;
  title: string;
  fileType: string;
  wordCount: number;
  createdAt: string;
}

interface Props {
  agentId: number;
  agentName: string;
  onClose: () => void;
}

export default function AgentKnowledgeDialog({ agentId, agentName, onClose }: Props) {
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const handleFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error('File too large — max 8MB.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^.]+$/, ''));

    setUploading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/files`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Upload failed');
      } else {
        toast.success(`Added "${data.title}" — your agent now knows it.`);
        await load();
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = async () => {
    if (!pasteTitle.trim() || !pasteContent.trim()) {
      toast.error('Title and content are required');
      return;
    }
    setUploading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pasteTitle.trim(), content: pasteContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Save failed');
      } else {
        toast.success(`Added "${data.title}".`);
        setPasteTitle('');
        setPasteContent('');
        setPasteOpen(false);
        await load();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: number) => {
    const prev = files;
    setFiles(f => f.filter(x => x.id !== fileId));
    const res = await fetch(`/api/agents/${agentId}/files/${fileId}`, { method: 'DELETE' });
    if (!res.ok) {
      setFiles(prev);
      toast.error('Could not delete file');
    } else {
      toast.success('Removed');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">Agent knowledge</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload syllabi, lecture notes, or textbook chapters. <span className="text-foreground font-medium">{agentName}</span> will use these as its primary source.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-secondary text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Upload zone */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-xl border border-dashed border-border bg-secondary/40 hover:bg-secondary p-4 text-left transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Upload a file</p>
              <p className="text-xs text-muted-foreground mt-0.5">PDF, TXT, or Markdown (max 8MB)</p>
            </button>
            <button
              type="button"
              onClick={() => setPasteOpen(o => !o)}
              disabled={uploading}
              className="rounded-xl border border-dashed border-border bg-secondary/40 hover:bg-secondary p-4 text-left transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Paste text</p>
              <p className="text-xs text-muted-foreground mt-0.5">Drop in notes or a syllabus</p>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {pasteOpen && (
            <div className="space-y-2 p-4 rounded-xl border border-border bg-secondary/30">
              <div>
                <Label htmlFor="paste-title" className="text-xs">Title</Label>
                <Input
                  id="paste-title"
                  value={pasteTitle}
                  onChange={e => setPasteTitle(e.target.value)}
                  placeholder="e.g. BIO 101 syllabus"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="paste-content" className="text-xs">Content</Label>
                <textarea
                  id="paste-content"
                  value={pasteContent}
                  onChange={e => setPasteContent(e.target.value)}
                  rows={8}
                  placeholder="Paste your notes, syllabus, or chapter text…"
                  className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setPasteOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handlePaste} disabled={uploading}>
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Reading and indexing your document…
            </div>
          )}

          {/* File list */}
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Files ({files.length})</p>
            {loading ? (
              <div className="space-y-2">
                {[0, 1].map(i => (
                  <div key={i} className="h-14 rounded-lg bg-secondary/40 animate-pulse" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl">
                No knowledge files yet. Upload your first one above.
              </div>
            ) : (
              <div className="space-y-2">
                {files.map(f => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {f.fileType.toUpperCase()} · {f.wordCount.toLocaleString()} words · {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                      aria-label="Remove file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground border-t border-border pt-3">
            Tip: scanned PDFs without selectable text can&apos;t be read. Use a digital PDF or paste the text directly.
          </div>
        </div>
      </div>
    </div>
  );
}
