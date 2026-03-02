import { useCallback, useEffect, useState } from 'react';
import { emptyProfile, UserProfile } from '@/types/profile';
import { toApiUrl } from '@/lib/api';

const PROFILE_STORAGE_KEY = 'recall-profile';

function normalizeProfile(
  raw: Partial<UserProfile> | null | undefined,
  fallback: Partial<UserProfile> = emptyProfile
): UserProfile {
  const fallbackView = fallback.defaultQuestionView === 'solution' ? 'solution' : 'practice';

  return {
    ...emptyProfile,
    ...fallback,
    ...raw,
    defaultQuestionView: raw?.defaultQuestionView === 'solution' ? 'solution' : fallbackView,
  };
}

function readLocalProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return emptyProfile;
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return emptyProfile;
  }
}

function writeLocalProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(readLocalProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(toApiUrl('/profile'));
      if (!response.ok) throw new Error('Failed to load profile');

      const data = (await response.json()) as UserProfile;
      const localProfile = readLocalProfile();
      const normalized = normalizeProfile(data, localProfile);
      setProfile(normalized);
      writeLocalProfile(normalized);
      setError('');
    } catch {
      const fallback = readLocalProfile();
      setProfile(fallback);
      setError('API unreachable. Showing local profile data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = useCallback(async (updates: UserProfile) => {
    const normalized = normalizeProfile(updates, profile);
    writeLocalProfile(normalized);
    setProfile(normalized);

    const response = await fetch(toApiUrl('/profile'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    });

    if (!response.ok) throw new Error('Failed to save profile');

    const data = (await response.json()) as UserProfile;
    const saved = normalizeProfile(data, normalized);
    setProfile(saved);
    writeLocalProfile(saved);
    setError('');
    return saved;
  }, [profile]);

  return { profile, setProfile, loading, error, loadProfile, saveProfile };
}
