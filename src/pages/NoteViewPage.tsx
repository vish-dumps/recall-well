import { useParams, useNavigate, Link } from 'react-router-dom';
import { Note } from '@/types/note';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Pencil, Trash2, Calendar } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface NoteViewPageProps {
  notes: Note[];
  onDelete: (id: string) => void;
}

export default function NoteViewPage({ notes, onDelete }: NoteViewPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const note = notes.find(n => n.id === id);
  const isDark = document.documentElement.classList.contains('dark');

  if (!note) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Note not found.</p>
        <Button asChild variant="link" className="mt-2"><Link to="/app">Back to notes</Link></Button>
      </div>
    );
  }

  const handleDelete = () => {
    onDelete(note.id);
    toast.success('Note deleted');
    navigate('/app');
  };

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={() => navigate('/app')} className="mb-6 gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{note.title}</h1>
            <DifficultyBadge difficulty={note.difficulty} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {note.tags.map(tag => (
              <span key={tag} className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{tag}</span>
            ))}
            <span className="text-xs text-muted-foreground font-mono">{note.platform}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/edit/${note.id}`}><Pencil className="h-4 w-4" /></Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8 text-sm text-muted-foreground">
        <ConfidenceBar value={note.confidence} />
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Next review: {format(new Date(note.nextRevisionDate), 'MMM d, yyyy')}
        </div>
        {note.link && (
          <a href={note.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> Problem Link
          </a>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {note.problemStatement && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Problem Statement</h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{note.problemStatement}</p>
          </section>
        )}
        {note.approach && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Approach</h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{note.approach}</p>
          </section>
        )}
        {note.mistakes && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Mistakes</h2>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{note.mistakes}</p>
          </section>
        )}
        {note.code && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Code</h2>
            <div className="border border-border rounded-lg overflow-hidden">
              <Editor
                height="300px"
                defaultLanguage="cpp"
                value={note.code}
                theme={isDark ? 'vs-dark' : 'light'}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, fontFamily: 'IBM Plex Mono, monospace', scrollBeyondLastLine: false, padding: { top: 12 } }}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
