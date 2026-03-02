import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PlatformRatings } from '@/types/profile';
import { useProfile } from './useProfile';
import { toApiUrl } from '@/lib/api';

const RATINGS_CACHE_KEY = 'recall-ratings-cache';
const RATINGS_CACHE_TIME = 1000 * 60 * 60; // 1 hour

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
}

const RatingsContext = createContext<RatingsContextType | undefined>(undefined);

export function RatingsProvider({ children }: { children: ReactNode }) {
    const { profile } = useProfile();
    const [ratings, setRatings] = useState<PlatformRatings | null>(readLocalRatings);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchRatings = useCallback(async (background = false) => {
        const hasAnyHandle = profile.leetcodeId || profile.codeforcesId;
        if (!hasAnyHandle) {
            setRatings(null);
            setError('');
            return;
        }

        if (!background) setLoading(true);
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
        } catch (err) {
            if (!background) {
                setError('Unable to load latest ratings right now.');
            }
        } finally {
            if (!background) setLoading(false);
        }
    }, [profile.codeforcesId, profile.leetcodeId]);

    useEffect(() => {
        const cached = readLocalRatings();
        const isOld = !cached?.fetchedAt || (Date.now() - new Date(cached.fetchedAt).getTime() > RATINGS_CACHE_TIME);

        if (!cached || isOld) {
            fetchRatings(!!cached); // true means silent background fetch if cache already existed but was just old
        }

        // Background sync every 5 minutes while the app is open
        const intervalId = setInterval(() => {
            fetchRatings(true);
        }, 1000 * 60 * 5);

        return () => clearInterval(intervalId);
    }, [fetchRatings]);

    // If there's no cache yet and we're loading, reflect that.
    return (
        <RatingsContext.Provider value={{ ratings, loading: (!ratings && loading), error }}>
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
