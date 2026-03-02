import { Difficulty, Note, normalizeGroupName, toGroupKey } from '@/types/note';

export type GroupKind = 'pinned' | 'difficulty' | 'tag' | 'custom';

export interface GroupCard {
  id: string;
  label: string;
  description: string;
  count: number;
  kind: GroupKind;
}

export const difficultyOrder: Difficulty[] = ['Easy', 'Medium', 'Hard'];

export function compareGroupNames(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: 'base' });
}

export function sortNotesByPinned(notes: Note[]): Note[] {
  return [...notes].sort((left, right) => {
    const pinDelta = Number(Boolean(right.isPinned)) - Number(Boolean(left.isPinned));
    if (pinDelta !== 0) return pinDelta;

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function buildSmartGroups(notes: Note[]): GroupCard[] {
  const pinnedCount = notes.filter(note => Boolean(note.isPinned)).length;
  const difficultyCounts = difficultyOrder.reduce<Record<Difficulty, number>>(
    (acc, level) => ({ ...acc, [level]: notes.filter(note => note.difficulty === level).length }),
    { Easy: 0, Medium: 0, Hard: 0 }
  );

  const tagCounts = new Map<string, { label: string; count: number }>();
  notes.forEach(note => {
    note.tags.forEach(rawTag => {
      const label = normalizeGroupName(rawTag);
      if (!label) return;
      const key = toGroupKey(label);
      const existing = tagCounts.get(key);
      if (existing) {
        existing.count += 1;
        return;
      }
      tagCounts.set(key, { label, count: 1 });
    });
  });

  const topTagGroups = Array.from(tagCounts.entries())
    .sort((a, b) => b[1].count - a[1].count || compareGroupNames(a[1].label, b[1].label))
    .slice(0, 8)
    .map(([key, value]) => ({
      id: `tag:${key}`,
      label: value.label,
      description: 'Auto tag group',
      count: value.count,
      kind: 'tag' as const,
    }));

  return [
    { id: 'pinned', label: 'Pinned', description: 'Pinned questions', count: pinnedCount, kind: 'pinned' },
    ...difficultyOrder.map(level => ({
      id: `difficulty:${level.toLowerCase()}`,
      label: level,
      description: 'Auto difficulty group',
      count: difficultyCounts[level],
      kind: 'difficulty' as const,
    })),
    ...topTagGroups,
  ];
}

export function buildCustomGroupCards(customGroups: string[], notes: Note[]): GroupCard[] {
  return [...customGroups].sort(compareGroupNames).map(groupName => {
    const key = toGroupKey(groupName);
    const count = notes.filter(note => (note.groups || []).some(group => toGroupKey(group) === key)).length;

    return {
      id: `custom:${key}`,
      label: groupName,
      description: 'Your custom group',
      count,
      kind: 'custom' as const,
    };
  });
}

export function normalizeGroupId(groupId: string): string {
  return groupId === 'favorite' ? 'pinned' : groupId;
}

export function getNotesForGroup(notes: Note[], groupId: string): Note[] {
  const normalizedGroupId = normalizeGroupId(groupId);

  if (normalizedGroupId === 'pinned') {
    return sortNotesByPinned(notes.filter(note => Boolean(note.isPinned)));
  }

  if (normalizedGroupId.startsWith('difficulty:')) {
    const difficultyKey = normalizedGroupId.replace('difficulty:', '');
    return sortNotesByPinned(notes.filter(note => note.difficulty.toLowerCase() === difficultyKey));
  }

  if (normalizedGroupId.startsWith('tag:')) {
    const tagKey = normalizedGroupId.replace('tag:', '');
    return sortNotesByPinned(notes.filter(note => note.tags.some(tag => toGroupKey(tag) === tagKey)));
  }

  if (normalizedGroupId.startsWith('custom:')) {
    const groupKey = normalizedGroupId.replace('custom:', '');
    return sortNotesByPinned(notes.filter(note => (note.groups || []).some(group => toGroupKey(group) === groupKey)));
  }

  return [];
}
