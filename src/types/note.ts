export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Note {
  id: string;
  title: string;
  platform: string;
  link: string;
  difficulty: Difficulty;
  tags: string[];
  problemStatement: string;
  approach: string;
  mistakes: string;
  code: string;
  confidence: number;
  revisionInterval: number;
  nextRevisionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRating {
  noteId: string;
  rating: 'easy' | 'okay' | 'hard';
  reviewDate: string;
}

export function calculateNextRevision(confidence: number): number {
  if (confidence <= 2) return 1;
  if (confidence === 3) return 3;
  if (confidence === 4) return 7;
  return 14;
}

export function getNextRevisionDate(interval: number): string {
  const date = new Date();
  date.setDate(date.getDate() + interval);
  return date.toISOString();
}

export function updateRevisionAfterReview(
  currentInterval: number,
  rating: 'easy' | 'okay' | 'hard'
): number {
  switch (rating) {
    case 'easy': return currentInterval * 2;
    case 'okay': return currentInterval;
    case 'hard': return 1;
  }
}
