import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search, Calendar, Pin, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { Difficulty, Note } from '@/types/note';
import { buildCustomGroupCards, buildSmartGroups, difficultyOrder, getNotesForGroup, normalizeGroupId } from '@/lib/groups';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GroupQuestionsPageProps {
  notes: Note[];
  customGroups: string[];
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

function decodeGroupId(value: string | undefined): string {
  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function GroupQuestionsPage({ notes, customGroups, onUpdate }: GroupQuestionsPageProps) {
  const params = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const groupId = normalizeGroupId(decodeGroupId(params.groupId));
  const allGroups = useMemo(() => [...buildSmartGroups(notes), ...buildCustomGroupCards(customGroups, notes)], [customGroups, notes]);
  const group = useMemo(() => allGroups.find(candidate => candidate.id === groupId) || null, [allGroups, groupId]);
  const groupNotes = useMemo(() => getNotesForGroup(notes, groupId), [groupId, notes]);

  const filtered = useMemo(() => {
    return groupNotes.filter(note => {
      const loweredSearch = search.toLowerCase();
      const matchSearch =
        note.title.toLowerCase().includes(loweredSearch) ||
        note.tags.some(tag => tag.toLowerCase().includes(loweredSearch));
      const matchDifficulty = filterDifficulty === 'all' || note.difficulty === filterDifficulty;
      return matchSearch && matchDifficulty;
    });
  }, [groupNotes, search, filterDifficulty]);

  if (!groupId) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/groups')} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Groups
        </Button>
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/groups')} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Groups
          </Button>
          <h1 className="text-3xl font-display tracking-wide text-foreground">{group?.label || 'GROUP'}</h1>
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          {groupNotes.length} question{groupNotes.length === 1 ? '' : 's'}
        </p>
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
                    onUpdate(note.id, { isPinned: !note.isPinned });
                  }}
                  className="rounded-full p-1.5 transition-colors hover:bg-muted"
                  title={note.isPinned ? 'Unpin question' : 'Pin question'}
                >
                  <Pin
                    className={cn(
                      'h-4 w-4 transition-colors',
                      note.isPinned ? 'fill-primary text-primary' : 'text-muted-foreground'
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
