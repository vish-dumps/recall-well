import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Note, createSolution, getNoteSolutions, normalizeGroupName, normalizeGroupNames, toGroupKey } from '@/types/note';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ExternalLink, Pencil, Trash2, Calendar, Pin, Plus } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { useProfile } from '@/hooks/useProfile';
import { getLanguagePreset, LANGUAGE_OPTIONS, normalizeEditorLanguage } from '@/lib/codePresets';
import { cn } from '@/lib/utils';

interface NoteViewPageProps {
  notes: Note[];
  customGroups: string[];
  onCreateGroup: (groupName: string) => string | null;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Note>) => void;
}

function getLanguageLabel(language: string) {
  return LANGUAGE_OPTIONS.find(option => option.value === normalizeEditorLanguage(language))?.label || 'C++';
}

export default function NoteViewPage({ notes, customGroups, onCreateGroup, onDelete, onUpdate }: NoteViewPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { profile } = useProfile();
  const note = notes.find(n => n.id === id);
  const prefersSolutionView = profile.defaultQuestionView === 'solution';

  const solutions = useMemo(() => (note ? getNoteSolutions(note) : []), [note]);

  const [showSolution, setShowSolution] = useState(prefersSolutionView);
  const [selectedSolutionId, setSelectedSolutionId] = useState('');
  const [revisionLanguage, setRevisionLanguage] = useState<'cpp' | 'java' | 'python' | 'javascript' | 'typescript' | 'csharp' | 'go' | 'rust'>('cpp');
  const [revisionCode, setRevisionCode] = useState(getLanguagePreset('cpp'));

  const [showAddApproachForm, setShowAddApproachForm] = useState(false);
  const [approachTitle, setApproachTitle] = useState('');
  const [approachNotes, setApproachNotes] = useState('');
  const [isGroupDialogOpen, setGroupDialogOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const initializedNoteRef = useRef<string | null>(null);
  const practiceDraftRef = useRef(revisionCode);

  useEffect(() => {
    if (!note) return;
    if (initializedNoteRef.current === note.id) return;
    initializedNoteRef.current = note.id;

    const initialSolutions = solutions;
    const defaultSolution = initialSolutions[0] || null;
    const defaultLanguage = normalizeEditorLanguage(defaultSolution?.language || note.language || 'cpp');
    const blankTemplate = getLanguagePreset(defaultLanguage);

    setRevisionLanguage(defaultLanguage);
    setRevisionCode(blankTemplate);
    setShowSolution(prefersSolutionView && initialSolutions.length > 0);
    setSelectedSolutionId(defaultSolution?.id || '');
    setShowAddApproachForm(false);
    setApproachTitle('');
    setApproachNotes('');
    setGroupDialogOpen(false);
    setSelectedGroups(note.groups || []);
    setNewGroupName('');
    practiceDraftRef.current = blankTemplate;
  }, [note, prefersSolutionView, solutions]);

  useEffect(() => {
    if (!showSolution) {
      practiceDraftRef.current = revisionCode;
    }
  }, [revisionCode, showSolution]);

  if (!note) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Note not found.</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/app">Back to notes</Link>
        </Button>
      </div>
    );
  }

  const selectedSolution = solutions.find(solution => solution.id === selectedSolutionId) || solutions[0] || null;
  const selectedApproachNotes = showAddApproachForm ? approachNotes.trim() : selectedSolution?.notes?.trim() || '';
  const hasProblemStatement = Boolean(note.problemStatement?.trim());
  const hasApproachNotes = Boolean(selectedApproachNotes);

  const editorLanguage = showSolution
    ? normalizeEditorLanguage(selectedSolution?.language || revisionLanguage)
    : revisionLanguage;

  const editorValue = showSolution ? selectedSolution?.code || '' : revisionCode;
  const noteGroups = note.groups || [];
  const availableGroups = normalizeGroupNames([...customGroups, ...noteGroups]).sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: 'base' })
  );

  const handleDelete = () => {
    onDelete(note.id);
    toast.success('Note deleted');
    navigate('/app');
  };

  const handleTogglePinnedQuestion = () => {
    onUpdate(note.id, { isPinned: !note.isPinned });
    toast.success(note.isPinned ? 'Question unpinned' : 'Question pinned');
  };

  const handleRevisionLanguageChange = (nextLanguage: string) => {
    const normalized = normalizeEditorLanguage(nextLanguage);
    setRevisionLanguage(normalized);
    setRevisionCode(getLanguagePreset(normalized));
  };

  const handleToggleSolution = (checked: boolean) => {
    if (checked && solutions.length === 0) {
      toast.info('No saved solutions yet. Add one with the Add Approach button.');
      return;
    }

    if (checked) {
      practiceDraftRef.current = revisionCode;
    } else {
      setRevisionCode(practiceDraftRef.current);
    }

    setShowSolution(checked);
  };

  const handleApproachComposerToggle = () => {
    setShowAddApproachForm(prev => {
      const next = !prev;
      if (next) {
        setShowSolution(false);
        const blankTemplate = getLanguagePreset(revisionLanguage);
        setRevisionCode(blankTemplate);
        practiceDraftRef.current = blankTemplate;
        setApproachTitle('');
        setApproachNotes('');
      }
      return next;
    });
  };

  const handleAddApproach = () => {
    if (!approachTitle.trim()) {
      toast.error('Approach title is required');
      return;
    }

    if (!revisionCode.trim() || revisionCode.trim() === getLanguagePreset(revisionLanguage).trim()) {
      toast.error('Write your approach code in the editor before saving.');
      return;
    }

    const newSolution = createSolution({
      title: approachTitle.trim(),
      notes: approachNotes.trim(),
      code: revisionCode,
      language: revisionLanguage,
    });

    const updatedSolutions = [...solutions, newSolution];
    const primary = updatedSolutions.find(solution => solution.isPinned) || updatedSolutions[0];

    onUpdate(note.id, {
      solutions: updatedSolutions,
      code: primary?.code || '',
      approach: primary?.notes || '',
      language: primary?.language || revisionLanguage,
    });

    setSelectedSolutionId(newSolution.id);
    setShowSolution(true);
    setShowAddApproachForm(false);
    setApproachTitle('');
    setApproachNotes('');

    toast.success('Approach added');
  };

  const handlePinApproach = (solutionId: string) => {
    const target = solutions.find(solution => solution.id === solutionId);
    if (!target) return;

    if (target.isPinned) {
      setSelectedSolutionId(solutionId);
      return;
    }

    const updatedSolutions = solutions.map(solution => ({
      ...solution,
      isPinned: solution.id === solutionId,
    }));

    const pinned = updatedSolutions.find(solution => solution.id === solutionId);
    onUpdate(note.id, {
      solutions: updatedSolutions,
      code: pinned?.code || '',
      approach: pinned?.notes || '',
      language: pinned?.language || note.language || 'cpp',
    });

    setSelectedSolutionId(solutionId);
    toast.success('Pinned approach updated');
  };

  const handleOpenGroupDialog = () => {
    setSelectedGroups(note.groups || []);
    setNewGroupName('');
    setGroupDialogOpen(true);
  };

  const handleToggleGroupSelection = (groupName: string, checked: boolean) => {
    const normalized = normalizeGroupName(groupName);
    if (!normalized) return;

    setSelectedGroups(prev => {
      const key = toGroupKey(normalized);
      if (checked) {
        if (prev.some(group => toGroupKey(group) === key)) return prev;
        return [...prev, normalized];
      }
      return prev.filter(group => toGroupKey(group) !== key);
    });
  };

  const handleCreateGroup = () => {
    const normalized = normalizeGroupName(newGroupName);
    if (!normalized) {
      toast.error('Group name is required');
      return;
    }

    const created = onCreateGroup(normalized);
    if (!created) {
      toast.error('Could not create group');
      return;
    }

    setSelectedGroups(prev => normalizeGroupNames([...prev, created]));
    setNewGroupName('');
    toast.success(`Group ready: ${created}`);
  };

  const handleSaveGroupAssignments = () => {
    const normalizedSelection = normalizeGroupNames(selectedGroups);
    onUpdate(note.id, { groups: normalizedSelection });
    setGroupDialogOpen(false);
    toast.success('Groups updated');
  };

  const editorHeading = showAddApproachForm ? 'NEW APPROACH' : showSolution ? 'SOLUTION' : 'PRACTICE';
  const editorDescription = showAddApproachForm
    ? 'Start a fresh approach. Write code in this editor, then save it as another solution.'
    : showSolution
      ? 'Viewing saved solution. Toggle off to return to your practice draft.'
      : 'Write your own code first, then toggle Show Solution to compare.';

  return (
    <div className="w-full py-5 px-4 md:px-6 xl:px-8">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr,1.15fr] gap-6 min-h-[calc(100vh-9rem)]">
        <div className="space-y-6 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app')} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-4xl font-display text-foreground">{note.title}</h1>
                <DifficultyBadge difficulty={note.difficulty} />
                <button
                  onClick={handleTogglePinnedQuestion}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                  title={note.isPinned ? 'Unpin question' : 'Pin question'}
                >
                  <Pin
                    className={cn(
                      'h-6 w-6 transition-colors',
                      note.isPinned ? 'fill-primary text-primary' : 'text-muted-foreground'
                    )}
                  />
                </button>
                <button
                  onClick={handleOpenGroupDialog}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                  title="Add to groups"
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {note.tags.map(tag => (
                  <span key={tag} className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
                <span className="text-xs text-muted-foreground font-mono">{note.platform}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link to={`/edit/${note.id}`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
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

          {hasProblemStatement && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Problem Statement</h2>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{note.problemStatement}</p>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Approach Notes</h2>
            {hasApproachNotes ? (
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{selectedApproachNotes}</p>
            ) : (
              <p className="text-muted-foreground">
                {showAddApproachForm ? 'Write notes for this new approach.' : 'No notes for this approach yet.'}
              </p>
            )}
          </section>

          {!hasProblemStatement && !hasApproachNotes && !showAddApproachForm && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h2>
              <p className="text-muted-foreground">No problem details added yet.</p>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card/60 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-semibold">Approaches</h3>
                <p className="text-xs text-muted-foreground">Saved solutions: {solutions.length}</p>
              </div>
              <Button onClick={handleApproachComposerToggle} size="sm">
                {showAddApproachForm ? 'Cancel' : 'Add Approach'}
              </Button>
            </div>

            {showAddApproachForm && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="approach-title">Approach Title</Label>
                  <Input
                    id="approach-title"
                    value={approachTitle}
                    onChange={event => setApproachTitle(event.target.value)}
                    placeholder="e.g. Top-down DP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approach-notes">Approach Notes</Label>
                  <Textarea
                    id="approach-notes"
                    value={approachNotes}
                    onChange={event => setApproachNotes(event.target.value)}
                    rows={4}
                    placeholder="Explain the core idea, complexity, and edge cases..."
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This saves the current code from the right editor as a new approach.
                </p>
                <Button onClick={handleAddApproach}>Save Current Code as Approach</Button>
              </div>
            )}
          </section>
        </div>

        <div className="relative min-h-[640px] rounded-2xl border border-border bg-card/60 p-4 lg:p-5 flex flex-col">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-2xl font-display tracking-wide text-foreground">{editorHeading}</h2>

            {!showSolution ? (
              <Select value={revisionLanguage} onValueChange={handleRevisionLanguageChange}>
                <SelectTrigger className="w-[140px] bg-background border-border">
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
            ) : (
              <p className="text-sm text-muted-foreground">{getLanguageLabel(editorLanguage)}</p>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">{editorDescription}</p>

          {showSolution && solutions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {solutions.map((solution, index) => (
                <div key={solution.id} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/60 p-1">
                  <Button
                    size="sm"
                    variant={selectedSolutionId === solution.id ? 'default' : 'outline'}
                    onClick={() => setSelectedSolutionId(solution.id)}
                    className={cn('h-7 px-2', selectedSolutionId !== solution.id && 'text-muted-foreground')}
                  >
                    {solution.title || `Approach ${index + 1}`}
                  </Button>
                  <button
                    type="button"
                    onClick={() => handlePinApproach(solution.id)}
                    className="rounded p-1 transition-colors hover:bg-muted"
                    title={solution.isPinned ? 'Pinned approach' : 'Pin this approach'}
                  >
                    <Pin
                      className={cn(
                        'h-3.5 w-3.5 transition-colors',
                        solution.isPinned ? 'fill-primary text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex-1 min-h-0 border border-border rounded-xl overflow-hidden">
            <Editor
              key={showSolution ? `solution-${selectedSolution?.id ?? 'none'}-${editorLanguage}` : `practice-${note.id}-${editorLanguage}`}
              height="100%"
              language={editorLanguage}
              value={editorValue}
              onChange={nextCode => {
                if (!showSolution) {
                  setRevisionCode(nextCode || '');
                }
              }}
              theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              options={{
                readOnly: showSolution,
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'IBM Plex Mono, monospace',
                scrollBeyondLastLine: false,
                padding: { top: 14 },
              }}
            />
          </div>

          <div className="absolute right-4 bottom-4 rounded-full border border-border bg-background/90 px-3 py-2 flex items-center gap-3 shadow-sm">
            <Label htmlFor="show-solution" className="text-xs text-muted-foreground cursor-pointer">
              Show Solution
            </Label>
            <Switch id="show-solution" checked={showSolution} onCheckedChange={handleToggleSolution} />
          </div>
        </div>
      </div>

      <Dialog open={isGroupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to groups</DialogTitle>
            <DialogDescription>
              Select from your existing groups, or create and add a new group.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {availableGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups yet. Create your first one below.</p>
            ) : (
              availableGroups.map(group => {
                const checked = selectedGroups.some(selected => toGroupKey(selected) === toGroupKey(group));
                return (
                  <label
                    key={group}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={next => handleToggleGroupSelection(group, next === true)}
                    />
                    <span className="truncate">{group}</span>
                  </label>
                );
              })
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-group-name">New group</Label>
            <div className="flex gap-2">
              <Input
                id="new-group-name"
                value={newGroupName}
                onChange={event => setNewGroupName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleCreateGroup();
                  }
                }}
                placeholder="e.g. Sliding Window"
              />
              <Button type="button" variant="outline" onClick={handleCreateGroup}>
                Create + Add
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGroupAssignments}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
