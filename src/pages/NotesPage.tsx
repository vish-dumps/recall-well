import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Calendar, Pin, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { Difficulty, Note } from '@/types/note';
import { sortNotesByFavorite } from '@/lib/groups';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotesPageProps {
  notes: Note[];
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

const difficultyOrder: Difficulty[] = ['Easy', 'Medium', 'Hard'];

export default function NotesPage({ notes, onUpdate }: NotesPageProps) {
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const filtered = useMemo(() => {
    return sortNotesByFavorite(notes).filter(note => {
      const matchSearch =
        note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      const matchDifficulty = filterDifficulty === 'all' || note.difficulty === filterDifficulty;
      return matchSearch && matchDifficulty;
    });
  }, [notes, search, filterDifficulty]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display tracking-wide text-foreground">NOTES</h1>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/groups">Groups</Link>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link to="/new">
              <Plus className="h-4 w-4" />
              New Note
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search questions by title or tags..."
            className="pl-9"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>
        <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
          <SelectTrigger className="w-[180px] shrink-0">
            <SelectValue placeholder="Filter by difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            {difficultyOrder.map(level => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card/30">
        <div className="hidden grid-cols-[minmax(0,1fr)_110px_100px_110px_36px] items-center gap-2 border-b border-border/80 bg-card/70 px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground md:grid">
          <span>Question</span>
          <span>Difficulty</span>
          <span>Next review</span>
          <span>Confidence</span>
          <span />
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-16 text-center text-muted-foreground">
            No questions found for this filter. Try another search.
          </p>
        ) : (
          <div className="divide-y divide-border/70">
            {filtered.map((note, index) => (
              <Link
                key={note.id}
                to={`/note/${note.id}`}
                className={cn(
                  'group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 transition-colors hover:bg-surface-hover/70 md:grid-cols-[minmax(0,1fr)_110px_100px_110px_36px]',
                  index % 2 === 1 && 'md:bg-card/15'
                )}
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="shrink-0 text-xs font-mono text-muted-foreground">{index + 1}.</span>
                  <h3 className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary md:text-[15px]">
                    {note.title}
                  </h3>
                  <div className="hidden min-w-0 items-center gap-1.5 lg:flex">
                    {note.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="truncate rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                        {tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{note.tags.length - 3}</span>
                    )}
                  </div>
                </div>

                <div className="hidden md:block">
                  <DifficultyBadge difficulty={note.difficulty} />
                </div>

                <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(note.nextRevisionDate), 'MMM d')}
                </div>

                <div className="hidden md:block">
                  <ConfidenceBar value={note.confidence} />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground md:hidden">
                  <DifficultyBadge difficulty={note.difficulty} />
                  <span>{format(new Date(note.nextRevisionDate), 'MMM d')}</span>
                </div>

                <button
                  onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    onUpdate(note.id, { isFavorite: !note.isFavorite });
                  }}
                  className="rounded-full p-1.5 transition-colors hover:bg-muted"
                  title={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart
                    className={cn(
                      'h-4 w-4 transition-colors',
                      note.isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'
                    )}
                  />
                </button>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
