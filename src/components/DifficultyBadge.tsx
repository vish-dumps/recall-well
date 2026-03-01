import { Difficulty } from '@/types/note';

const styles: Record<Difficulty, string> = {
  Easy: 'bg-easy/15 text-easy',
  Medium: 'bg-medium/15 text-medium',
  Hard: 'bg-hard/15 text-hard',
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${styles[difficulty]}`}>
      {difficulty}
    </span>
  );
}
