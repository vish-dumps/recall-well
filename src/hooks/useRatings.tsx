import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PlatformRatings } from '@/types/profile';
import { useProfile } from './useProfile';
import { toApiUrl } from '@/lib/api';

const RATINGS_CACHE_KEY = 'recall-ratings-cache';

function readLocalRatings(): PlatformRatings | null {
    try {
        const raw = localStorage.getItem(RATINGS_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeLocalRatings(ratings: PlatformRatings) {
    localStorage.setItem(RATINGS_CACHE_KEY, JSON.stringify(ratings));
}

interface RatingsContextType {
    ratings: PlatformRatings | null;
    loading: boolean;
    error: string;
    refreshRatings: () => Promise<void>;
}

const RatingsContext = createContext<RatingsContextType | undefined>(undefined);

export function RatingsProvider({ children }: { children: ReactNode }) {
    const { profile } = useProfile();
    const [ratings, setRatings] = useState<PlatformRatings | null>(readLocalRatings);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const refreshRatings = useCallback(async () => {
        const hasAnyHandle = profile.leetcodeId || profile.codeforcesId;
        if (!hasAnyHandle) {
            setRatings(null);
            setError('');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (profile.leetcodeId) params.set('leetcodeId', profile.leetcodeId);
            if (profile.codeforcesId) params.set('codeforcesId', profile.codeforcesId);

            const response = await fetch(toApiUrl(`/ratings?${params.toString()}`));
            if (!response.ok) throw new Error('Unable to load ratings');

            const data = (await response.json()) as PlatformRatings;
            data.fetchedAt = new Date().toISOString();
            setRatings(data);
            writeLocalRatings(data);
        } catch {
            setError('Unable to load latest ratings right now.');
        } finally {
            setLoading(false);
        }
    }, [profile.codeforcesId, profile.leetcodeId]);

    useEffect(() => {
        const hasAnyHandle = profile.leetcodeId || profile.codeforcesId;
        if (!hasAnyHandle) {
            setRatings(null);
            setError('');
            return;
        }

        setRatings(readLocalRatings());
    }, [profile.codeforcesId, profile.leetcodeId]);

    return (
        <RatingsContext.Provider value={{ ratings, loading, error, refreshRatings }}>
            {children}
        </RatingsContext.Provider>
    );
}

export function useRatings() {
    const context = useContext(RatingsContext);
    if (context === undefined) {
        throw new Error('useRatings must be used within a RatingsProvider');
    }
    return context;
}
