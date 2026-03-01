import { useState, useEffect, useCallback } from 'react';
import { Note, calculateNextRevision, getNextRevisionDate, updateRevisionAfterReview } from '@/types/note';

const STORAGE_KEY = 'recall-notes';

function loadNotes(): Note[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

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
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  const getDueNotes = useCallback(() => {
    const now = new Date().toISOString();
    return notes.filter(n => n.nextRevisionDate <= now);
  }, [notes]);

  const reviewNote = useCallback((id: string, rating: 'easy' | 'okay' | 'hard') => {
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const newInterval = updateRevisionAfterReview(n.revisionInterval, rating);
      return {
        ...n,
        revisionInterval: newInterval,
        nextRevisionDate: getNextRevisionDate(newInterval),
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  return { notes, addNote, updateNote, deleteNote, getDueNotes, reviewNote };
}
