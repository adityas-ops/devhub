import { useState } from 'react';
import { authorize } from 'react-native-app-auth';
import { githubAuthConfig } from './authConfig';
import { saveToken, clearToken } from '../storage/secureStorage';
import { saveUser, clearUser, GitHubUser } from '../storage/mmkvStorage';
import { api } from '../utils/api';

interface AuthState {
  loading: boolean;
  error: string | null;
}

interface LoginResult {
  success: boolean;
  user?: GitHubUser;
}

export const useGitHubAuth = () => {
  const [state, setState] = useState<AuthState>({
    loading: false,
    error: null,
  });

  const login = async (): Promise<LoginResult> => {
    try {
      console.log('--- Starting GitHub Login Flow ---');
      setState({ loading: true, error: null });

      // Step 1: Open GitHub OAuth browser flow
      console.log('1. Opening browser for authorization...');
      const authState = await authorize(githubAuthConfig);
      console.log('   -> Success! Received authState with accessToken.');

      // Step 2: Save token to Keychain FIRST so api interceptor can use it
      console.log('2. Saving token securely...');
      await saveToken(authState.accessToken);
      console.log('   -> Token saved successfully.');

      // Step 3: Fetch user profile using your api client (auto-injects token via interceptor)
      console.log('3. Fetching user profile from GitHub API...');
      const user = await api.get<GitHubUser>('/user');
      console.log('   -> User profile fetched successfully:', user?.login);

      // Step 4: Cache user in MMKV
      console.log('4. Caching user data in MMKV storage...');
      saveUser(user);
      console.log('   -> User cached successfully!');

      console.log('--- Login Flow Completed Successfully ---');
      setState({ loading: false, error: null });
      return { success: true, user };
    } catch (err: unknown) {
      console.log('!!! Error during login flow:', err);
      const message = err instanceof Error ? err.message : 'Login failed';

      // Don't show error if user manually cancelled the browser
      if (
        !message.includes('cancelled') &&
        !message.includes('User cancelled')
      ) {
        setState({ loading: false, error: message });
      } else {
        console.log('   -> User cancelled the flow manually.');
        setState({ loading: false, error: null });
      }

      return { success: false };
    }
  };

  const logout = async (): Promise<void> => {
    console.log('--- Logging out ---');
    await clearToken();
    clearUser();
    console.log('   -> Successfully logged out and cleared storage.');
  };

  return {
    login,
    logout,
    loading: state.loading,
    error: state.error,
  };
};
