import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Note,
  calculateNextRevision,
  getNextRevisionDate,
  normalizeGroupName,
  normalizeGroupNames,
  normalizeNote,
  toGroupKey,
  updateRevisionAfterReview,
} from '@/types/note';
import { toApiUrl } from '@/lib/api';

const STORAGE_KEY = 'recall-notes';
const GROUPS_STORAGE_KEY = 'recall-custom-groups';
const PINNED_GROUPS_STORAGE_KEY = 'recall-pinned-groups';
const REMOTE_SYNC_INTERVAL_MS = 15000;

function loadNotes(): Note[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const notes = data ? (JSON.parse(data) as Note[]) : [];
    return notes.map(normalizeNote);
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function loadCustomGroups(): string[] {
  try {
    const data = localStorage.getItem(GROUPS_STORAGE_KEY);
    return normalizeGroupNames(data ? (JSON.parse(data) as string[]) : []);
  } catch {
    return [];
  }
}

function saveCustomGroups(groups: string[]) {
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
}

function loadPinnedGroups(): string[] {
  try {
    const data = localStorage.getItem(PINNED_GROUPS_STORAGE_KEY);
    return data ? (JSON.parse(data) as string[]) : [];
  } catch {
    return [];
  }
}

function savePinnedGroups(groups: string[]) {
  localStorage.setItem(PINNED_GROUPS_STORAGE_KEY, JSON.stringify(groups));
}

function mergeGroupLists(existing: string[], incoming: string[]): string[] {
  return normalizeGroupNames([...existing, ...incoming]);
}

function isSameGroupList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((group, index) => group === right[index]);
}

function buildNotesSignature(notes: Note[]): string {
  return [...notes]
    .map(note => `${note.id}:${note.updatedAt}`)
    .sort()
    .join('|');
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [customGroups, setCustomGroups] = useState<string[]>(loadCustomGroups);
  const [pinnedGroups, setPinnedGroups] = useState<string[]>(loadPinnedGroups);
  const notesRef = useRef<Note[]>(notes);
  const customGroupsRef = useRef<string[]>(customGroups);

  useEffect(() => {
    saveNotes(notes);
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    saveCustomGroups(customGroups);
    customGroupsRef.current = customGroups;
  }, [customGroups]);

  useEffect(() => {
    savePinnedGroups(pinnedGroups);
  }, [pinnedGroups]);

  useEffect(() => {
    const groupsFromNotes = normalizeGroupNames(notes.flatMap(note => note.groups || []));
    if (groupsFromNotes.length === 0) return;

    setCustomGroups(prev => {
      const merged = mergeGroupLists(prev, groupsFromNotes);
      return isSameGroupList(prev, merged) ? prev : merged;
    });
  }, [notes]);

  const upsertNoteToApi = useCallback(async (note: Note) => {
    try {
      await fetch(toApiUrl('/notes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });
    } catch {
      // Local storage remains the source of truth when the API is unavailable.
    }
  }, []);

  const updateNoteInApi = useCallback(async (note: Note) => {
    try {
      await fetch(toApiUrl(`/notes/${note.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      });
    } catch {
      // Ignore API errors and keep local updates.
    }
  }, []);

  const deleteNoteInApi = useCallback(async (id: string) => {
    try {
      await fetch(toApiUrl(`/notes/${id}`), {
        method: 'DELETE',
      });
    } catch {
      // Ignore API errors and keep local updates.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadRemoteNotes = async () => {
      try {
        const response = await fetch(toApiUrl('/notes'));
        if (!response.ok) return;

        const remoteNotes = ((await response.json()) as Note[]).map(normalizeNote);
        if (cancelled) return;

        if (remoteNotes.length > 0) {
          const remoteSignature = buildNotesSignature(remoteNotes);
          const localSignature = buildNotesSignature(notesRef.current);
          if (remoteSignature !== localSignature) {
            setNotes(remoteNotes);
          }
          return;
        }

        if (notesRef.current.length > 0) {
          notesRef.current.forEach(note => {
            void upsertNoteToApi(note);
          });
        }
      } catch {
        // Continue with local storage if backend is down.
      }
    };

    loadRemoteNotes();

    return () => {
      cancelled = true;
    };
  }, [upsertNoteToApi]);

  useEffect(() => {
    const timer = setInterval(() => {
      void (async () => {
        try {
          const response = await fetch(toApiUrl('/notes'));
          if (!response.ok) return;

          const remoteNotes = ((await response.json()) as Note[]).map(normalizeNote);
          if (remoteNotes.length === 0) return;

          const remoteSignature = buildNotesSignature(remoteNotes);
          const localSignature = buildNotesSignature(notesRef.current);
          if (remoteSignature !== localSignature) {
            setNotes(remoteNotes);
          }
        } catch {
          // Silent polling failure; local notes stay visible.
        }
      })();
    }, REMOTE_SYNC_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const addNote = useCallback((note: Omit<Note, 'id' | 'revisionInterval' | 'nextRevisionDate' | 'createdAt' | 'updatedAt'>) => {
    const interval = calculateNextRevision(note.confidence);
    const newNote: Note = {
      ...note,
      id: crypto.randomUUID(),
      revisionInterval: interval,
      nextRevisionDate: getNextRevisionDate(interval),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const normalized = normalizeNote(newNote);
    setNotes(prev => [normalized, ...prev]);
    if (normalized.groups && normalized.groups.length > 0) {
      setCustomGroups(prev => {
        const merged = mergeGroupLists(prev, normalized.groups || []);
        return isSameGroupList(prev, merged) ? prev : merged;
      });
    }
    void upsertNoteToApi(normalized);
    return normalized;
  }, [upsertNoteToApi]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    const current = notesRef.current.find(note => note.id === id);
    if (!current) return;

    const updated = normalizeNote({ ...current, ...updates, updatedAt: new Date().toISOString() } as Note);
    setNotes(prev => prev.map(note => (note.id === id ? updated : note)));
    if (updated.groups && updated.groups.length > 0) {
      setCustomGroups(prev => {
        const merged = mergeGroupLists(prev, updated.groups || []);
        return isSameGroupList(prev, merged) ? prev : merged;
      });
    }
    void updateNoteInApi(updated);
  }, [updateNoteInApi]);

  const createCustomGroup = useCallback((groupName: string) => {
    const normalized = normalizeGroupName(groupName);
    if (!normalized) return null;

    const exists = customGroupsRef.current.some(group => toGroupKey(group) === toGroupKey(normalized));
    if (exists) {
      const existing = customGroupsRef.current.find(group => toGroupKey(group) === toGroupKey(normalized));
      return existing || normalized;
    }

    setCustomGroups(prev => {
      const merged = mergeGroupLists(prev, [normalized]);
      return isSameGroupList(prev, merged) ? prev : merged;
    });
    return normalized;
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    void deleteNoteInApi(id);
  }, [deleteNoteInApi]);

  const getDueNotes = useCallback(() => {
    const now = new Date().toISOString();
    return notes.filter(n => n.nextRevisionDate <= now);
  }, [notes]);

  const reviewNote = useCallback((id: string, rating: 'easy' | 'okay' | 'hard') => {
    setNotes(prev => {
      const next = prev.map(n => {
        if (n.id !== id) return n;
        const newInterval = updateRevisionAfterReview(n.revisionInterval, rating);
        return normalizeNote({
          ...n,
          revisionInterval: newInterval,
          nextRevisionDate: getNextRevisionDate(newInterval),
          updatedAt: new Date().toISOString(),
        });
      });
      const updated = next.find(n => n.id === id);
      if (updated) {
        void updateNoteInApi(updated);
      }
      return next;
    });
  }, [updateNoteInApi]);

  const togglePinGroup = useCallback((groupId: string) => {
    setPinnedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      }
      return [...prev, groupId];
    });
  }, []);

  return { notes, customGroups, pinnedGroups, createCustomGroup, togglePinGroup, addNote, updateNote, deleteNote, getDueNotes, reviewNote };
}
