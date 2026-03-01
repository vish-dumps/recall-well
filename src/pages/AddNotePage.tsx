import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Note, Difficulty } from '@/types/note';
import { X } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { toast } from 'sonner';

interface AddNotePageProps {
  onSave: (note: Omit<Note, 'id' | 'revisionInterval' | 'nextRevisionDate' | 'createdAt' | 'updatedAt'>) => Note;
  editNote?: Note;
  onUpdate?: (id: string, updates: Partial<Note>) => void;
}

const platforms = ['LeetCode', 'Codeforces', 'HackerRank', 'CodeChef', 'AtCoder', 'GFG', 'Other'];

export default function AddNotePage({ onSave, editNote, onUpdate }: AddNotePageProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(editNote?.title || '');
  const [platform, setPlatform] = useState(editNote?.platform || 'LeetCode');
  const [link, setLink] = useState(editNote?.link || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(editNote?.difficulty || 'Medium');
  const [tags, setTags] = useState<string[]>(editNote?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [problemStatement, setProblemStatement] = useState(editNote?.problemStatement || '');
  const [approach, setApproach] = useState(editNote?.approach || '');
  const [mistakes, setMistakes] = useState(editNote?.mistakes || '');
  const [code, setCode] = useState(editNote?.code || '');
  const [confidence, setConfidence] = useState(editNote?.confidence || 3);

  // Auto-save
  const autoSaveRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!editNote) return;
    autoSaveRef.current = setTimeout(() => {
      onUpdate?.(editNote.id, { title, platform, link, difficulty, tags, problemStatement, approach, mistakes, code, confidence });
    }, 30000);
    return () => clearTimeout(autoSaveRef.current);
  }, [title, platform, link, difficulty, tags, problemStatement, approach, mistakes, code, confidence, editNote, onUpdate]);

  const addTag = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags(prev => [...prev, tagInput.trim()]);
      }
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (editNote) {
      onUpdate?.(editNote.id, { title, platform, link, difficulty, tags, problemStatement, approach, mistakes, code, confidence });
      toast.success('Note updated');
    } else {
      onSave({ title, platform, link, difficulty, tags, problemStatement, approach, mistakes, code, confidence });
      toast.success('Note saved');
    }
    navigate('/app');
  };

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-8">
        {editNote ? 'Edit Note' : 'New Note'}
      </h1>

      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Two Sum" />
        </div>

        {/* Platform & Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={v => setDifficulty(v as Difficulty)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Link */}
        <div className="space-y-2">
          <Label>Link</Label>
          <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://leetcode.com/problems/..." />
        </div>

        {/* Tags */}
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
            placeholder="Type tag and press Enter"
          />
        </div>

        {/* Problem Statement */}
        <div className="space-y-2">
          <Label>Problem Statement</Label>
          <Textarea value={problemStatement} onChange={e => setProblemStatement(e.target.value)} rows={4} placeholder="Describe the problem..." />
        </div>

        {/* Approach */}
        <div className="space-y-2">
          <Label>Approach</Label>
          <Textarea value={approach} onChange={e => setApproach(e.target.value)} rows={4} placeholder="Your approach to solving it..." />
        </div>

        {/* Mistakes */}
        <div className="space-y-2">
          <Label>Mistakes</Label>
          <Textarea value={mistakes} onChange={e => setMistakes(e.target.value)} rows={3} placeholder="Common mistakes or edge cases..." />
        </div>

        {/* Code */}
        <div className="space-y-2">
          <Label>Code</Label>
          <div className="border border-border rounded-lg overflow-hidden">
            <Editor
              height="300px"
              defaultLanguage="cpp"
              value={code}
              onChange={v => setCode(v || '')}
              theme={isDark ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'IBM Plex Mono, monospace',
                scrollBeyondLastLine: false,
                padding: { top: 12 },
              }}
            />
          </div>
        </div>

        {/* Confidence */}
        <div className="space-y-3">
          <Label>Confidence: <span className="font-mono text-primary">{confidence}</span></Label>
          <Slider
            value={[confidence]}
            onValueChange={v => setConfidence(v[0])}
            min={1}
            max={5}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>Can't recall</span>
            <span>Solid</span>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} size="lg">
            {editNote ? 'Update Note' : 'Save Note'}
          </Button>
        </div>
      </div>
    </div>
  );
}
