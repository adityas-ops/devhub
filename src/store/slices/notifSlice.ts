import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface GitHubNotification {
  id: string;
  unread: boolean;
  reason: string; // 'review_requested' | 'mention' | 'subscribed' | 'assign' | 'author' | 'comment' | 'ci_activity' | 'manual'
  updated_at: string;
  last_read_at: string | null;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: 'PullRequest' | 'Issue' | 'Release' | 'Commit' | 'Discussion';
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    owner: {
      login: string;
      avatar_url: string;
    };
  };
  subscription_url: string;
  url: string;
}

interface NotifState {
  notifications: GitHubNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  filter: 'all' | 'participating' | 'mentions';
}

const initialState: NotifState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  filter: 'all',
};

const notifSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setNotifications(state, action: PayloadAction<GitHubNotification[]>) {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => n.unread).length;
    },
    markRead(state, action: PayloadAction<string>) {
      const notif = state.notifications.find(n => n.id === action.payload);
      if (notif) {
        notif.unread = false;
      }
      state.unreadCount = state.notifications.filter(n => n.unread).length;
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter(
        n => n.id !== action.payload,
      );
      state.unreadCount = state.notifications.filter(n => n.unread).length;
    },
    clearAll(state) {
      state.notifications = state.notifications.map(n => ({
        ...n,
        unread: false,
      }));
      state.unreadCount = 0;
    },
    setFilter(
      state,
      action: PayloadAction<'all' | 'participating' | 'mentions'>,
    ) {
      state.filter = action.payload;
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
  },
});

export const {
  setLoading,
  setError,
  setNotifications,
  markRead,
  removeNotification,
  clearAll,
  setFilter,
  setUnreadCount,
} = notifSlice.actions;

export default notifSlice.reducer;
