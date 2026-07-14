import { useState, useCallback } from 'react';
import {
  getRecentSearches,
  saveRecentSearches,
  clearRecentSearches,
} from '../storage/mmkvStorage';

/**
 * Hook to manage recent searches persisted in MMKV.
 * - Reads from storage on init
 * - Deduplicates and prepends new queries
 * - Caps at 10 items
 */
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    getRecentSearches(),
  );

  const saveRecent = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    setRecentSearches(prev => {
      // Remove duplicate, prepend new query, cap at 10
      const updated = [trimmed, ...prev.filter(s => s !== trimmed)].slice(
        0,
        10,
      );
      saveRecentSearches(updated);
      return updated;
    });
  }, []);

  const clearRecents = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  return { recentSearches, saveRecent, clearRecents };
}
