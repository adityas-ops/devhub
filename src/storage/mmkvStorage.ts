import { createMMKV, MMKV } from 'react-native-mmkv';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  bio?: string | null;
}

export const storage: MMKV = createMMKV({ id: 'devhub-storage' });

export const saveUser = (user: GitHubUser) =>
  storage.set('user', JSON.stringify(user));

export const getUser = (): GitHubUser | null => {
  const u = storage.getString('user');
  return u ? JSON.parse(u) : null;
};

export const clearUser = () => storage.remove('user');

