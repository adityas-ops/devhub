import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type {SwipeableMethods} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  clearAll,
  GitHubNotification,
  removeNotification,
  setFilter,
  setLoading,
  setNotifications,
  setUnreadCount,
} from '../../store/slices/notifSlice';
import api from '../../utils/api';
import {timeAgo} from '../../utils/timeHelper';

// ─── Helpers ──────────────────────────────────────────────────────────────────



function getTypeIcon(notif: GitHubNotification): string {
  const type = notif.subject.type;
  const reason = notif.reason;
  if (type === 'PullRequest') {
    if (reason === 'review_requested') return '👁';
    return '🔀';
  }
  if (type === 'Issue') {
    if (reason === 'mention') return '💬';
    return '🔴';
  }
  if (type === 'Release') return '🏷️';
  return '📌';
}

function applyFilter(
  notifications: GitHubNotification[],
  filter: 'all' | 'participating' | 'mentions',
): GitHubNotification[] {
  if (filter === 'participating') {
    return notifications.filter(
      n =>
        n.reason === 'assign' ||
        n.reason === 'author' ||
        n.reason === 'comment' ||
        n.reason === 'review_requested',
    );
  }
  if (filter === 'mentions') {
    return notifications.filter(n => n.reason === 'mention');
  }
  return notifications;
}

// ─── Swipe Actions ────────────────────────────────────────────────────────────

function LeftSwipeAction({
  progress,
}: {
  progress: SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-88, 0],
      'clamp',
    );
    return {transform: [{translateX}]};
  });
  return (
    <Animated.View style={[styles.swipeActionLeft, animStyle]}>
      <Text style={styles.swipeActionIcon}>✓</Text>
      <Text style={styles.swipeActionLabel}>Read</Text>
    </Animated.View>
  );
}



// ─── Notification Row ─────────────────────────────────────────────────────────

interface NotifRowProps {
  item: GitHubNotification;
  onMarkRead: (id: string, url: string) => void;
}

function NotifRow({item, onMarkRead}: NotifRowProps) {
  const swipeRef = useRef<SwipeableMethods>(null);

  const handleSwipeRight = useCallback(() => {
    swipeRef.current?.close();
    onMarkRead(item.id, item.url);
  }, [item.id, item.url, onMarkRead]);

  const icon = getTypeIcon(item);

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      leftThreshold={60}
      renderLeftActions={(progress) => <LeftSwipeAction progress={progress} />}
      onSwipeableOpen={() => {
        handleSwipeRight();
      }}>
      <View style={styles.notifCard}>
          {/* Icon bubble with overlaid unread dot */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconBubble}>
              <Text style={styles.iconText}>{icon}</Text>
            </View>
            {item.unread && <View style={styles.unreadDot} />}
          </View>

          {/* Content */}
          <View style={styles.notifContent}>
            <Text style={styles.repoName} numberOfLines={1}>
              {item.repository.full_name}
            </Text>
            <Text
              style={[
                styles.notifTitle,
                item.unread && styles.notifTitleUnread,
              ]}
              numberOfLines={2}>
              {item.subject.title}
            </Text>
          </View>

          {/* Timestamp */}
          <Text style={styles.timestamp}>{timeAgo(item.updated_at)}</Text>
        </View>
    </Swipeable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Inbox() {
  const dispatch = useAppDispatch();
  const {notifications, unreadCount, loading, filter} = useAppSelector(
    s => s.notifications,
  );
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) dispatch(setLoading(true));
        const params: Record<string, string> = {all: 'true'};
        if (filter === 'participating') params.participating = 'true';
        const data = await api.get<GitHubNotification[]>('/notifications', {
          params,
        });
        if (Array.isArray(data)) {
          dispatch(setNotifications(data));
        }
      } catch (err: any) {
        console.warn('fetchNotifications error:', err?.message);
      } finally {
        dispatch(setLoading(false));
        setRefreshing(false);
      }
    },
    [dispatch, filter],
  );

  const pollUnreadCount = useCallback(async () => {
    try {
      const data = await api.get<GitHubNotification[]>('/notifications', {
        params: {all: 'false'},
      });
      if (Array.isArray(data)) dispatch(setUnreadCount(data.length));
    } catch {
      // Silently ignore
    }
  }, [dispatch]);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const id = setInterval(pollUnreadCount, 60000);
    return () => clearInterval(id);
  }, [pollUnreadCount]);

  const handleMarkRead = useCallback(
    async (id: string, threadUrl: string) => {
      dispatch(removeNotification(id));
      try {
        const threadId = threadUrl.split('/').pop();
        await api.patch(`/notifications/threads/${threadId}`);
      } catch (err: any) {
        console.warn('markRead error:', err?.message);
      }
    },
    [dispatch],
  );



  const handleMarkAllRead = useCallback(async () => {
    Alert.alert(
      'Mark all as read',
      'This will mark all notifications as read.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Mark all',
          onPress: async () => {
            dispatch(clearAll());
            try {
              await api.put('/notifications');
            } catch (err: any) {
              console.warn('markAllRead error:', err?.message);
            }
          },
        },
      ],
    );
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications(true);
  }, [fetchNotifications]);

  const filtered = applyFilter(notifications, filter);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inbox</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up 🎉'}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllRead}
            accessibilityLabel="Mark all notifications as read">
            <View style={styles.badgeCircle}>
              <Text style={styles.badgeCount}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
            <Text style={styles.checkMark}>✓</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Swipe hint ── */}
      <View style={styles.hintRow}>
        <Text style={styles.hintChevron}>›</Text>
        <Text style={styles.hintText}>
          Swipe a notification right to mark as read
        </Text>
      </View>


      {/* ── Content ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listContentEmpty,
        ]}
        renderItem={({item}) => (
          <NotifRow
            item={item}
            onMarkRead={handleMarkRead}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading && !refreshing ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#1a1a2e" />
              <Text style={styles.loadingText}>Loading notifications…</Text>
            </View>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                No notifications for this filter.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F4F0',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 2,
    backgroundColor: '#F5F4F0',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 1,
    fontWeight: '500',
  },

  // Mark-all button
  markAllBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 1,
  },
  badgeCircle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EA580C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  badgeCount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  checkMark: {
    fontSize: 20,
    color: '#1a1a2e',
    fontWeight: '700',
    marginTop: 6,
  },

  // ── Swipe hint ──
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 4,
  },
  hintChevron: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },


  // ── List ──
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },

  // ── Notification card ──
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    backgroundColor: '#ffffff',
  },

  // ── Icon with overlaid dot ──
  iconWrapper: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#F5F4F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#ffffff',
  },

  // ── Content ──
  notifContent: {
    flex: 1,
  },
  repoName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    marginBottom: 3,
    letterSpacing: 0.1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    lineHeight: 19,
  },
  notifTitleUnread: {
    fontWeight: '700',
    color: '#1a1a2e',
  },

  // ── Timestamp ──
  timestamp: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '500',
    flexShrink: 0,
  },

  // ── Swipe actions ──
  swipeActionLeft: {
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginRight: 8,
    width: 88,
  },

  swipeActionIcon: {
    fontSize: 22,
  },
  swipeActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },

  // ── Loading / Empty ──
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
  },
  emptyEmoji: {
    fontSize: 52,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
