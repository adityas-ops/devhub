import { createMMKV, MMKV } from 'react-native-mmkv';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  followers?: number;
  following?: number;
  public_repos?: number;
}

export const storage: MMKV = createMMKV({ id: 'devhub-storage' });

export const saveUser = (user: GitHubUser) =>
  storage.set('user', JSON.stringify(user));

export const getUser = (): GitHubUser | null => {
  const u = storage.getString('user');
  return u ? JSON.parse(u) : null;
};

export const clearUser = () => storage.remove('user');

// ─── Recent Searches ───
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10;

export const getRecentSearches = (): string[] => {
  const raw = storage.getString(RECENT_SEARCHES_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const saveRecentSearches = (searches: string[]): void => {
  storage.set(
    RECENT_SEARCHES_KEY,
    JSON.stringify(searches.slice(0, MAX_RECENT_SEARCHES)),
  );
};

export const clearRecentSearches = (): void => {
  storage.remove(RECENT_SEARCHES_KEY);
};

