export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface NoteSolution {
  id: string;
  title: string;
  notes: string;
  code: string;
  language: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  platform: string;
  link: string;
  difficulty: Difficulty;
  tags: string[];
  groups?: string[];
  problemStatement: string;
  notes: string;
  approach: string;
  mistakes: string;
  code: string;
  language?: string;
  solutions?: NoteSolution[];
  isPinned?: boolean;
  isFavorite?: boolean;
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

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeGroupName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

export function toGroupKey(name: string): string {
  return normalizeGroupName(name).toLowerCase();
}

export function normalizeGroupNames(groups?: string[]): string[] {
  if (!Array.isArray(groups)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  groups.forEach(group => {
    const next = normalizeGroupName(group);
    if (!next) return;
    const key = toGroupKey(next);
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(next);
  });

  return normalized;
}

export function createSolution(input: {
  title: string;
  notes: string;
  code: string;
  language: string;
  isPinned?: boolean;
}): NoteSolution {
  const now = new Date().toISOString();
  return {
    id: createLocalId(),
    title: input.title,
    notes: input.notes,
    code: input.code,
    language: input.language,
    isPinned: Boolean(input.isPinned),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeSolutionList(solutions: NoteSolution[]): NoteSolution[] {
  const normalized = solutions.map(solution => ({
    ...solution,
    title: solution.title || 'Approach',
    notes: solution.notes || '',
    code: solution.code || '',
    language: solution.language || 'cpp',
    isPinned: Boolean(solution.isPinned),
  }));

  const pinned = normalized.find(solution => solution.isPinned);
  if (!pinned) return normalized;

  return [
    { ...pinned, isPinned: true },
    ...normalized
      .filter(solution => solution.id !== pinned.id)
      .map(solution => ({ ...solution, isPinned: false })),
  ];
}

export function getNoteSolutions(note: Note): NoteSolution[] {
  if (Array.isArray(note.solutions) && note.solutions.length > 0) {
    return normalizeSolutionList(note.solutions);
  }

  if (!note.code?.trim() && !note.approach?.trim() && !note.notes?.trim()) {
    return [];
  }

  return [
    {
      id: `${note.id}-legacy`,
      title: 'Approach 1',
      notes: note.approach || note.notes || '',
      code: note.code || '',
      language: note.language || 'cpp',
      isPinned: true,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    },
  ];
}

export function getPrimarySolution(note: Note): NoteSolution | null {
  const solutions = getNoteSolutions(note);
  return solutions.length > 0 ? solutions[0] : null;
}

export function normalizeNote(note: Note): Note {
  const solutions = getNoteSolutions(note);
  const primary = solutions[0] || null;
  const isLegacyShape = typeof (note as Partial<Note>).notes === 'undefined';
  const normalizedNotes = isLegacyShape ? note.problemStatement || '' : note.notes || '';
  const normalizedProblemStatement = isLegacyShape ? '' : note.problemStatement || '';
  const normalizedGroups = normalizeGroupNames(note.groups);
  const normalizedPinned = typeof note.isPinned === 'boolean' ? note.isPinned : Boolean(note.isFavorite);

  return {
    ...note,
    problemStatement: normalizedProblemStatement,
    notes: normalizedNotes,
    groups: normalizedGroups,
    language: primary?.language || note.language || 'cpp',
    code: primary?.code || note.code || '',
    approach: primary?.notes || note.approach || note.notes || '',
    mistakes: note.mistakes || '',
    solutions,
    isPinned: Boolean(note.isPinned),
    isFavorite: Boolean(note.isFavorite),
  };
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
