import { createSlice } from '@reduxjs/toolkit';

interface AuthState {
  isOnboarded: boolean;
  isAuthenticated: boolean;
  user: { email: string } | null;
}

const initialState: AuthState = {
  isOnboarded: false,
  isAuthenticated: false,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    completeOnboarding(state) {
      state.isOnboarded = true;
    },
    login(state, action) {
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
