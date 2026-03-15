import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LANGUAGE_OPTIONS, normalizeEditorLanguage } from '@/lib/codePresets';
import { cn } from '@/lib/utils';

const GENERAL_NOTES_STORAGE_KEY = 'recall-general-notes';

interface GeneralNote {
  id: string;
  title: string;
  language: string;
  code: string;
  notes: string;
  nextRevisionDate: string;
  createdAt: string;
  updatedAt: string;
}

function toDateInputValue(value?: string): string {
  const fallback = format(addDays(new Date(), 3), 'yyyy-MM-dd');
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return format(parsed, 'yyyy-MM-dd');
}

function normalizeGeneralNote(note: Partial<GeneralNote>): GeneralNote {
  const now = new Date().toISOString();
  return {
    id: note.id || crypto.randomUUID(),
    title: note.title?.trim() || 'Untitled note',
    language: normalizeEditorLanguage(note.language),
    code: note.code || '',
    notes: note.notes || '',
    nextRevisionDate: toDateInputValue(note.nextRevisionDate),
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || now,
  };
}

function sortGeneralNotes(notes: GeneralNote[]): GeneralNote[] {
  return [...notes].sort((left, right) => {
    const dateCompare = left.nextRevisionDate.localeCompare(right.nextRevisionDate);
    if (dateCompare !== 0) return dateCompare;
    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function loadGeneralNotes(): GeneralNote[] {
  try {
    const raw = localStorage.getItem(GENERAL_NOTES_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<GeneralNote>[]) : [];
    return sortGeneralNotes(parsed.map(normalizeGeneralNote));
  } catch {
    return [];
  }
}

function saveGeneralNotes(notes: GeneralNote[]) {
  localStorage.setItem(GENERAL_NOTES_STORAGE_KEY, JSON.stringify(notes));
}

function getLanguageLabel(language: string): string {
  return LANGUAGE_OPTIONS.find(option => option.value === language)?.label || 'C++';
}

export default function GeneralNotesPage() {
  const [snippetNotes, setSnippetNotes] = useState<GeneralNote[]>(loadGeneralNotes);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [nextRevisionDate, setNextRevisionDate] = useState(toDateInputValue());

  useEffect(() => {
    saveGeneralNotes(snippetNotes);
  }, [snippetNotes]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const filteredNotes = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    if (!searchValue) return snippetNotes;

    return snippetNotes.filter(note => (
      note.title.toLowerCase().includes(searchValue) ||
      note.notes.toLowerCase().includes(searchValue) ||
      note.code.toLowerCase().includes(searchValue)
    ));
  }, [search, snippetNotes]);

  const dueCount = useMemo(
    () => snippetNotes.filter(note => note.nextRevisionDate <= today).length,
    [snippetNotes, today]
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setLanguage('cpp');
    setCode('');
    setNotes('');
    setNextRevisionDate(toDateInputValue());
  };

  const handleSave = () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      toast.error('Title is required');
      return;
    }

    if (!code.trim() && !notes.trim()) {
      toast.error('Add code or notes before saving');
      return;
    }

    const now = new Date().toISOString();

    if (editingId) {
      setSnippetNotes(prev => sortGeneralNotes(prev.map(note => (
        note.id === editingId
          ? normalizeGeneralNote({
            ...note,
            title: normalizedTitle,
            language,
            code,
            notes,
            nextRevisionDate,
            updatedAt: now,
          })
          : note
      ))));
      toast.success('General note updated');
    } else {
      const created = normalizeGeneralNote({
        title: normalizedTitle,
        language,
        code,
        notes,
        nextRevisionDate,
      });
      setSnippetNotes(prev => sortGeneralNotes([created, ...prev]));
      toast.success('General note saved');
    }

    resetForm();
  };

  const handleEdit = (note: GeneralNote) => {
    setEditingId(note.id);
    setTitle(note.title);
    setLanguage(normalizeEditorLanguage(note.language));
    setCode(note.code);
    setNotes(note.notes);
    setNextRevisionDate(toDateInputValue(note.nextRevisionDate));
  };

  const handleDelete = (id: string) => {
    setSnippetNotes(prev => prev.filter(note => note.id !== id));
    if (editingId === id) resetForm();
    toast.success('General note deleted');
  };

  const handleMarkRevised = (id: string) => {
    const nextDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    const now = new Date().toISOString();

    setSnippetNotes(prev => sortGeneralNotes(prev.map(note => (
      note.id === id
        ? {
          ...note,
          nextRevisionDate: nextDate,
          updatedAt: now,
        }
        : note
    ))));

    toast.success('Revision moved 7 days ahead');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display tracking-wide text-foreground">GENERAL NOTES</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Save reusable approaches, snippets, and revision notes without linking to a question.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: <span className="text-foreground font-semibold">{snippetNotes.length}</span> | Due:{' '}
          <span className={cn('font-semibold', dueCount > 0 ? 'text-primary' : 'text-foreground')}>{dueCount}</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{editingId ? 'Edit General Note' : 'New General Note'}</CardTitle>
            <CardDescription>Code snippet + notes + next revision date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="general-title">Title</Label>
              <Input
                id="general-title"
                placeholder="e.g. Binary Lifting Template"
                value={title}
                onChange={event => setTitle(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="general-language">Language</Label>
              <Select value={language} onValueChange={value => setLanguage(normalizeEditorLanguage(value))}>
                <SelectTrigger id="general-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="general-code">Code Snippet</Label>
              <Textarea
                id="general-code"
                value={code}
                onChange={event => setCode(event.target.value)}
                rows={10}
                placeholder="Paste your reusable code snippet..."
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="general-notes">Notes</Label>
              <Textarea
                id="general-notes"
                value={notes}
                onChange={event => setNotes(event.target.value)}
                rows={5}
                placeholder="Key ideas, caveats, complexity, edge cases..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="general-next-revision">Next Revision Date</Label>
              <Input
                id="general-next-revision"
                type="date"
                value={nextRevisionDate}
                onChange={event => setNextRevisionDate(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button onClick={handleSave} className="gap-2">
                <Plus className="h-4 w-4" />
                {editingId ? 'Update Note' : 'Save Note'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by title, notes, or code..."
              className="pl-9"
            />
          </div>

          {filteredNotes.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                No general notes found. Create your first snippet note from the left panel.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map(note => {
                const isDue = note.nextRevisionDate <= today;

                return (
                  <article
                    key={note.id}
                    className={cn(
                      'rounded-2xl border border-border bg-card/30 p-4 space-y-3',
                      isDue && 'border-primary/50 bg-primary/5'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground truncate">{note.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getLanguageLabel(note.language)} | Revise: {note.nextRevisionDate}
                          {isDue && <span className="text-primary font-semibold"> (Due)</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(note)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(note.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {note.notes && (
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">
                        {note.notes}
                      </p>
                    )}

                    {note.code && (
                      <pre className="rounded-lg border border-border bg-background/80 p-3 text-xs font-mono whitespace-pre overflow-auto max-h-48">
                        {note.code}
                      </pre>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <Button variant="outline" size="sm" onClick={() => handleMarkRevised(note.id)} className="gap-2">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Mark Revised (+7d)
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Updated {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
