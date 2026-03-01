import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { Note, Difficulty } from '@/types/note';
import { format } from 'date-fns';

interface NotesPageProps {
  notes: Note[];
}

export default function NotesPage({ notes }: NotesPageProps) {
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const filtered = useMemo(() => {
    return notes.filter(n => {
      const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchDiff = filterDifficulty === 'all' || n.difficulty === filterDifficulty;
      return matchSearch && matchDiff;
    });
  }, [notes, search, filterDifficulty]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">Notes</h1>
        <Button asChild size="sm" className="gap-2">
          <Link to="/new">
            <Plus className="h-4 w-4" />
            Add Note
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes or tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Easy">Easy</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-sm">No notes yet.</p>
          <Button asChild variant="link" className="mt-2">
            <Link to="/new">Create your first note</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(note => (
            <Link
              key={note.id}
              to={`/note/${note.id}`}
              className="block bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all hover:shadow-sm group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-2">
                    <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {note.title}
                    </h3>
                    <DifficultyBadge difficulty={note.difficulty} />
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {note.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-2">
                  <ConfidenceBar value={note.confidence} />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(note.nextRevisionDate), 'MMM d')}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
