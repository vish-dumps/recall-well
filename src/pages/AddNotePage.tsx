import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Note, Difficulty, createSolution, getNoteSolutions } from '@/types/note';
import { X } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { getLanguagePreset, isCodePreset, LANGUAGE_OPTIONS, normalizeEditorLanguage } from '@/lib/codePresets';

interface AddNotePageProps {
  onSave: (note: Omit<Note, 'id' | 'revisionInterval' | 'nextRevisionDate' | 'createdAt' | 'updatedAt'>) => Note;
  editNote?: Note;
  onUpdate?: (id: string, updates: Partial<Note>) => void;
}

const platforms = ['LeetCode', 'Codeforces', 'HackerRank', 'CodeChef', 'AtCoder', 'GFG', 'Other'];

export default function AddNotePage({ onSave, editNote, onUpdate }: AddNotePageProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const initialLanguage = normalizeEditorLanguage(editNote?.language);
  const existingSolutions = useMemo(() => (editNote ? getNoteSolutions(editNote) : []), [editNote]);
  const initialPrimarySolution = existingSolutions[0] || null;
  const [title, setTitle] = useState(editNote?.title || '');
  const [platform, setPlatform] = useState(editNote?.platform || 'LeetCode');
  const [link, setLink] = useState(editNote?.link || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(editNote?.difficulty || 'Medium');
  const [tags, setTags] = useState<string[]>(editNote?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [problemStatement, setProblemStatement] = useState(editNote?.problemStatement || '');
  const [approachTitle, setApproachTitle] = useState(initialPrimarySolution?.title || 'Approach 1');
  const [approachNotes, setApproachNotes] = useState(initialPrimarySolution?.notes || editNote?.approach || editNote?.notes || '');
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(initialPrimarySolution?.code || editNote?.code || getLanguagePreset(initialLanguage));
  const [confidence, setConfidence] = useState(editNote?.confidence || 3);

  const preservedMistakes = editNote?.mistakes || '';
  const preservedGroups = useMemo(() => editNote?.groups || [], [editNote]);

  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>();

  const buildCodePayload = useCallback(() => {
    const hasCustomCode = code.trim().length > 0 && !isCodePreset(code, language);
    const normalizedApproachTitle = approachTitle.trim() || 'Approach 1';
    const normalizedApproachNotes = approachNotes.trim();
    const inputCode = hasCustomCode ? code : '';

    if (existingSolutions.length > 0) {
      const now = new Date().toISOString();
      const [primary, ...rest] = existingSolutions;
      const updatedPrimary = {
        ...primary,
        title: normalizedApproachTitle,
        notes: normalizedApproachNotes,
        code: hasCustomCode ? code : primary.code,
        language,
        updatedAt: now,
      };
      const nextSolutions = [updatedPrimary, ...rest];
      const defaultSolution = nextSolutions.find(solution => solution.isPinned) || nextSolutions[0];

      return {
        code: defaultSolution?.code || '',
        approach: defaultSolution?.notes || '',
        solutions: nextSolutions,
      };
    }

    const primary = createSolution({
      title: normalizedApproachTitle,
      notes: normalizedApproachNotes,
      code: inputCode,
      language,
      isPinned: true,
    });

    return {
      code: primary.code,
      approach: primary.notes,
      solutions: [primary],
    };
  }, [approachNotes, approachTitle, code, existingSolutions, language]);

  useEffect(() => {
    if (!editNote) return;

    autoSaveRef.current = setTimeout(() => {
      const codePayload = buildCodePayload();
      onUpdate?.(editNote.id, {
        title,
        platform,
        link,
        difficulty,
        tags,
        groups: preservedGroups,
        problemStatement,
        notes: '',
        approach: codePayload.approach,
        mistakes: preservedMistakes,
        code: codePayload.code,
        language,
        solutions: codePayload.solutions,
        confidence,
      });
    }, 30000);

    return () => clearTimeout(autoSaveRef.current);
  }, [
    buildCodePayload,
    confidence,
    difficulty,
    editNote,
    language,
    link,
    onUpdate,
    platform,
    preservedGroups,
    preservedMistakes,
    approachNotes,
    approachTitle,
    problemStatement,
    tags,
    title,
  ]);

  const addTag = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && tagInput.trim()) {
        e.preventDefault();
        if (!tags.includes(tagInput.trim())) {
          setTags(prev => [...prev, tagInput.trim()]);
        }
        setTagInput('');
      }
    },
    [tagInput, tags]
  );

  const handleLanguageChange = (nextLanguage: string) => {
    const normalizedLanguage = normalizeEditorLanguage(nextLanguage);
    setLanguage(normalizedLanguage);
    setCode(getLanguagePreset(normalizedLanguage));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!approachTitle.trim()) {
      toast.error('Approach 1 title is required');
      return;
    }

    const codePayload = buildCodePayload();
    const payload = {
      title,
      platform,
      link,
      difficulty,
      tags,
      groups: preservedGroups,
      problemStatement,
      notes: '',
      approach: codePayload.approach,
      mistakes: preservedMistakes,
      code: codePayload.code,
      language,
      solutions: codePayload.solutions,
      isPinned: editNote?.isPinned || false,
      isFavorite: editNote?.isPinned || false,
      confidence,
    };

    if (editNote) {
      onUpdate?.(editNote.id, payload);
      toast.success('Question updated');
    } else {
      onSave(payload);
      toast.success('Question saved');
    }

    navigate('/app');
  };

  return (
    <div className="w-full h-full min-h-0 py-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full px-4 md:px-6 xl:px-8">
        <div className="min-w-0 h-full min-h-0">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="space-y-6 pb-6">
                <div className="flex items-center justify-between mt-4 mb-2">
                  <h1 className="text-3xl font-display tracking-wide text-foreground">{editNote ? 'EDIT QUESTION' : 'ADD QUESTION'}</h1>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Two Sum" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {platforms.map(p => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={difficulty} onValueChange={v => setDifficulty(v as Difficulty)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Problem Link</Label>
                  <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://leetcode.com/problems/..." />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 text-xs font-mono bg-muted text-muted-foreground px-2.5 py-1 rounded-md">
                        {tag}
                        <button onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-foreground">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder="Type and press Enter to add tags..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Problem Statement</Label>
                  <Textarea
                    value={problemStatement}
                    onChange={e => setProblemStatement(e.target.value)}
                    rows={4}
                    placeholder="Paste problem statement / constraints..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Approach 1 Name</Label>
                  <Input
                    value={approachTitle}
                    onChange={event => setApproachTitle(event.target.value)}
                    placeholder="e.g. Two pointers + hash map"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Approach 1 Notes</Label>
                  <Textarea
                    value={approachNotes}
                    onChange={event => setApproachNotes(event.target.value)}
                    rows={5}
                    placeholder="Write notes for this specific approach..."
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <Label>
                    Confidence: <span className="font-mono text-primary">{confidence}</span>
                  </Label>
                  <Slider value={[confidence]} onValueChange={v => setConfidence(v[0])} min={1} max={5} step={1} />
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>Can't recall</span>
                    <span>Solid</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 pt-3 pb-2 border-t border-border bg-background/95 backdrop-blur">
              <Button onClick={handleSave} size="lg" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-display tracking-wide">
                {editNote ? 'UPDATE QUESTION' : 'SAVE QUESTION'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-4 xl:border-l border-border h-full min-h-0 w-full xl:pl-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl mt-4 font-display tracking-wide text-foreground">APPROACH 1 CODE</h2>
            <Select value={language} onValueChange={handleLanguageChange}>
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
          </div>

          <div className="border border-border rounded-lg overflow-hidden flex-grow min-h-0 shadow-sm">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={v => setCode(v || '')}
              theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'IBM Plex Mono, monospace',
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                roundedSelection: false,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
