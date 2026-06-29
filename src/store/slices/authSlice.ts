import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { storage, getUser, GitHubUser } from '../../storage/mmkvStorage';

interface AuthState {
  isOnboarded: boolean;
  isAuthenticated: boolean;
  user: GitHubUser | null;
}

const initialUser = getUser();

const initialState: AuthState = {
  isOnboarded: storage.getBoolean('isOnboarded') ?? false,
  isAuthenticated: !!initialUser,
  user: initialUser,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    completeOnboarding(state) {
      state.isOnboarded = true;
      storage.set('isOnboarded', true);
    },
    login(state, action: PayloadAction<GitHubUser>) {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.user = null;
    },
  },
});

export const { completeOnboarding, login, logout } = authSlice.actions;
export default authSlice.reducer;
