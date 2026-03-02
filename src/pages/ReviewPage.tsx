import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Note, getPrimarySolution } from '@/types/note';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { Button } from '@/components/ui/button';
import { Brain, Eye, Code, ArrowRight, CheckCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useTheme } from '@/hooks/useTheme';

interface ReviewPageProps {
  dueNotes: Note[];
  onReview: (id: string, rating: 'easy' | 'okay' | 'hard') => void;
}

export default function ReviewPage({ dueNotes, onReview }: ReviewPageProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showApproach, setShowApproach] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [rated, setRated] = useState(false);

  if (dueNotes.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <CheckCircle className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">All caught up!</h2>
        <p className="text-muted-foreground mb-6">No revisions due. Great job.</p>
        <Button onClick={() => navigate('/app')} variant="outline">Back to Notes</Button>
      </div>
    );
  }

  if (currentIndex >= dueNotes.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <CheckCircle className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Session complete!</h2>
        <p className="text-muted-foreground mb-6">You reviewed {dueNotes.length} note{dueNotes.length > 1 ? 's' : ''}.</p>
        <Button onClick={() => navigate('/app')} variant="outline">Back to Notes</Button>
      </div>
    );
  }

  const note = dueNotes[currentIndex];
  const primarySolution = getPrimarySolution(note);
  const revealedApproach = primarySolution?.notes || note.approach;
  const revealedCode = primarySolution?.code || note.code;
  const revealedLanguage = primarySolution?.language || note.language || 'cpp';
  const visibleProblem = note.problemStatement || note.notes || 'No problem statement.';

  const handleRate = (rating: 'easy' | 'okay' | 'hard') => {
    onReview(note.id, rating);
    setRated(true);
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev + 1);
    setShowApproach(false);
    setShowCode(false);
    setRated(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-4">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8 text-sm text-muted-foreground font-mono">
        <span>{currentIndex + 1} / {dueNotes.length}</span>
        <div className="flex gap-1">
          {dueNotes.map((_, i) => (
            <div key={i} className={`h-1 w-6 rounded-full ${i <= currentIndex ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="bg-card border border-border rounded-2xl p-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-bold text-foreground">{note.title}</h2>
          <DifficultyBadge difficulty={note.difficulty} />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {note.tags.map(tag => (
            <span key={tag} className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{tag}</span>
          ))}
        </div>

        {/* Problem */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Problem Statement</h3>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">{visibleProblem}</p>
        </section>

        {/* Reveal buttons */}
        {!showApproach && (
          <Button variant="outline" onClick={() => setShowApproach(true)} className="gap-2 mr-3 mb-3">
            <Eye className="h-4 w-4" /> Reveal Approach
          </Button>
        )}
        {!showCode && (
          <Button variant="outline" onClick={() => setShowCode(true)} className="gap-2 mb-3">
            <Code className="h-4 w-4" /> Reveal Code
          </Button>
        )}

        {showApproach && revealedApproach && (
          <section className="mt-4 mb-6 animate-fade-in">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Approach</h3>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{revealedApproach}</p>
          </section>
        )}

        {showCode && revealedCode && (
          <section className="mt-4 mb-6 animate-fade-in">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Code</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <Editor
                height="250px"
                language={revealedLanguage}
                value={revealedCode}
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, fontFamily: 'IBM Plex Mono, monospace', scrollBeyondLastLine: false, padding: { top: 12 } }}
              />
            </div>
          </section>
        )}

        {/* Rating */}
        {!rated ? (
          <div className="mt-8 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Brain className="h-4 w-4" />
              How well did you recall?
            </p>
            <div className="flex gap-3">
              <Button onClick={() => handleRate('hard')} variant="outline" className="flex-1 border-hard/30 text-hard hover:bg-hard/10">
                Hard
              </Button>
              <Button onClick={() => handleRate('okay')} variant="outline" className="flex-1 border-medium/30 text-medium hover:bg-medium/10">
                Okay
              </Button>
              <Button onClick={() => handleRate('easy')} variant="outline" className="flex-1 border-easy/30 text-easy hover:bg-easy/10">
                Easy
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 border-t border-border pt-6 flex justify-end animate-fade-in">
            <Button onClick={handleNext} className="gap-2">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
