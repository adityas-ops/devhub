import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6/static';
import { useAppSelector } from '../../store';
import { api } from '../../utils/api';
import { timeAgo } from '../../utils/timeHelper';

interface Repo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string; avatar_url: string };
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
}

interface ActivityEvent {
  id: string;
  type: string;
  actor: { login: string; avatar_url: string };
  repo: { name: string };
  created_at: string;
  payload?: any;
}

import {
  SkeletonRepoCard,
  SkeletonActivityRow,
} from '../../components/home/Skeletons';
import { AnimatedRepoCard } from '../../components/home/AnimatedRepoCard';
import { Toast } from '../../components/home/Toast';

export default function Home() {
  const user = useAppSelector(state => state.auth.user);

  const [activeTab, setActiveTab] = useState<
    'Starred' | 'Trending' | 'Activity'
  >('Starred');
  const [activeLanguage, setActiveLanguage] = useState<string>('All');

  const [starredRepos, setStarredRepos] = useState<Repo[]>([]);
  const [trendingRepos, setTrendingRepos] = useState<Repo[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [starredSet, setStarredSet] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const login = user?.login || 'adityas-ops';
      const [starredRes, eventsRes] = await Promise.all([
        api.get<Repo[]>('/user/starred'),
        api.get<ActivityEvent[]>(`/users/${login}/events`),
      ]);
      setStarredRepos(starredRes);
      setActivities(eventsRes);

      const newStarredSet = new Set(starredRes.map(r => r.full_name));
      setStarredSet(newStarredSet);
    } catch (error) {
      console.warn('Error fetching user data:', error);
    }
  }, [user]);

  const fetchTrending = useCallback(async () => {
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const dateStr = lastMonth.toISOString().split('T')[0];
      const trendingRes = await api.get<{ items: Repo[] }>(
        `/search/repositories?q=created:>${dateStr}&sort=stars&order=desc`,
      );
      setTrendingRepos(trendingRes.items || []);
    } catch (error) {
      console.warn('Error fetching trending data:', error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchData(), fetchTrending()]);
    setLoading(false);
  }, [fetchData, fetchTrending]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchTrending()]);
    setRefreshing(false);
  };

  const currentRepos = activeTab === 'Starred' ? starredRepos : trendingRepos;
  const availableLanguages = useMemo(() => {
    const langs = new Set(currentRepos.map(r => r.language).filter(Boolean));
    return ['All', ...Array.from(langs)];
  }, [currentRepos]);

  useEffect(() => {
    if (!availableLanguages.includes(activeLanguage)) {
      setActiveLanguage('All');
    }
  }, [availableLanguages, activeLanguage]);

  const displayedRepos = useMemo(() => {
    if (activeLanguage === 'All') return currentRepos;
    return currentRepos.filter(r => r.language === activeLanguage);
  }, [currentRepos, activeLanguage]);

  const toggleStar = async (repoFullName: string) => {
    const isStarred = starredSet.has(repoFullName);
    const newSet = new Set(starredSet);
    const previousStarredRepos = [...starredRepos];

    if (isStarred) {
      newSet.delete(repoFullName);
      // Optimistically remove from starred list
      setStarredRepos(prev => prev.filter(r => r.full_name !== repoFullName));
    } else {
      newSet.add(repoFullName);
      // Optimistically add to starred list — find the repo from trending
      const repoToAdd = trendingRepos.find(r => r.full_name === repoFullName);
      if (repoToAdd) {
        setStarredRepos(prev => [repoToAdd, ...prev]);
      }
    }

    setStarredSet(newSet);
    const [repoOwner, repoName] = repoFullName.split('/');
    try {
      if (isStarred) {
        await api.delete(`/user/starred/${repoOwner}/${repoName}`);
        setToastMsg({ message: 'Unstarred successfully', type: 'success' });
      } else {
        await api.put(
          `/user/starred/${repoOwner}/${repoName}`,
          {},
          {
            headers: {
              'Content-Length': '0',
              'Content-Type': '',
            },
          },
        );
        setToastMsg({ message: 'Starred successfully', type: 'success' });
      }
    } catch (error: any) {
      console.warn('Failed to toggle star:', error);
      // Revert both starredSet and starredRepos on failure
      setStarredSet(starredSet);
      setStarredRepos(previousStarredRepos);
      if (error?.status === 404) {
        setToastMsg({
          message: 'Error: Repository not found or missing permissions',
          type: 'error',
        });
      } else {
        setToastMsg({ message: 'Error toggling star', type: 'error' });
      }
    }
  };

  const getLanguageColor = (lang: string) => {
    switch (lang) {
      case 'JavaScript':
        return '#f1e05a';
      case 'TypeScript':
        return '#3178c6';
      case 'Python':
        return '#3572A5';
      case 'C':
        return '#555555';
      case 'C++':
        return '#f34b7d';
      case 'Java':
        return '#b07219';
      case 'HTML':
        return '#e34c26';
      case 'CSS':
        return '#563d7c';
      case 'Go':
        return '#00ADD8';
      case 'Rust':
        return '#dea584';
      default:
        return '#cbd5e1';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const renderRepo = ({ item, index }: { item: Repo; index: number }) => {
    const isStarred = starredSet.has(item.full_name);
    return (
      <AnimatedRepoCard index={index}>
        <View style={styles.repoCard}>
          <View style={styles.repoHeaderRow}>
            <Image
              source={{ uri: item.owner?.avatar_url }}
              style={styles.repoAvatar}
            />
            <View style={styles.repoTitleContainer}>
              <Text style={styles.repoTitle} numberOfLines={1}>
                {item.full_name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleStar(item.full_name)}
              style={styles.starButton}
            >
              <FontAwesome6
                name="star"
                size={16}
                color={isStarred ? '#f59e0b' : '#94a3b8'}
                iconStyle={isStarred ? 'solid' : 'regular'}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.repoDesc} numberOfLines={2}>
            {item.description || 'No description provided.'}
          </Text>
          <View style={styles.repoMetaRow}>
            {item.language && (
              <View style={styles.metaItem}>
                <View
                  style={[
                    styles.langDot,
                    { backgroundColor: getLanguageColor(item.language) },
                  ]}
                />
                <Text style={styles.metaText}>{item.language}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <FontAwesome6 name="star" size={12} color="#94a3b8" />
              <Text style={styles.metaText}>
                {formatNumber(item.stargazers_count)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome6
                name="code-branch"
                size={12}
                color="#94a3b8"
                iconStyle="solid"
              />
              <Text style={styles.metaText}>
                {formatNumber(item.forks_count)}
              </Text>
            </View>
          </View>
        </View>
      </AnimatedRepoCard>
    );
  };

  const getActivityDetails = (event: ActivityEvent) => {
    switch (event.type) {
      case 'WatchEvent':
        return {
          icon: 'star',
          color: '#f59e0b',
          bg: '#fef3c7',
          text: 'starred',
        };
      case 'PushEvent':
        return {
          icon: 'code-commit',
          color: '#8b5cf6',
          bg: '#ede9fe',
          text: 'pushed to',
        };
      case 'PullRequestEvent':
        return {
          icon: 'code-pull-request',
          color: '#ec4899',
          bg: '#fce7f3',
          text: 'opened a pull request in',
        };
      case 'ForkEvent':
        return {
          icon: 'code-branch',
          color: '#10b981',
          bg: '#d1fae5',
          text: 'forked',
        };
      case 'CreateEvent':
        return {
          icon: 'book',
          color: '#3b82f6',
          bg: '#dbeafe',
          text: 'created repository',
        };
      default:
        return {
          icon: 'github',
          color: '#64748b',
          bg: '#f1f5f9',
          text: 'interacted with',
        };
    }
  };

  const renderActivity = ({
    item,
    index,
  }: {
    item: ActivityEvent;
    index: number;
  }) => {
    const details = getActivityDetails(item);
    return (
      <AnimatedRepoCard index={index}>
        <View style={styles.activityRow}>
          <View
            style={[styles.activityIconBox, { backgroundColor: details.bg }]}
          >
            <FontAwesome6
              name={details.icon as any}
              size={14}
              color={details.color}
              iconStyle="solid"
            />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              You <Text style={styles.boldText}>{details.text}</Text>{' '}
              <Text style={styles.repoTitleActivity}>{item.repo.name}</Text>
            </Text>
            <Text style={styles.activityTime}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>
      </AnimatedRepoCard>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {toastMsg && (
        <Toast
          message={toastMsg.message}
          type={toastMsg.type}
          onClose={() => setToastMsg(null)}
        />
      )}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Home</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={handleRefresh}>
            <FontAwesome6
              name="rotate-right"
              size={16}
              color="#0f172a"
              iconStyle="solid"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <FontAwesome6 name="bell" size={16} color="#0f172a" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {['Starred', 'Trending', 'Activity'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {(activeTab === 'Starred' || activeTab === 'Trending') &&
        availableLanguages.length > 1 && (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContainer}
            >
              {availableLanguages.map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.filterChip,
                    activeLanguage === lang && styles.activeFilterChip,
                  ]}
                  onPress={() => setActiveLanguage(lang)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeLanguage === lang && styles.activeFilterText,
                    ]}
                  >
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

      {loading ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'Activity'
            ? Array.from({ length: 8 }).map((_, i) => (
                <SkeletonActivityRow key={i} />
              ))
            : Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRepoCard key={i} />
              ))}
        </ScrollView>
      ) : activeTab === 'Activity' ? (
        <FlatList
          data={activities}
          renderItem={renderActivity}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No recent activity</Text>
          }
        />
      ) : (
        <FlatList
          data={displayedRepos}
          renderItem={renderRepo}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No repositories found</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f5',
  },
  // centerContainer: {
  //   flex: 1,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#edece8',
    borderRadius: 20,
    marginHorizontal: 24,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  activeTabText: {
    color: '#0f172a',
  },
  filterScroll: {
    maxHeight: 40,
    marginBottom: 20,
  },
  filterContainer: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    height: 36,
    justifyContent: 'center',
  },
  activeFilterChip: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 24,
  },
  repoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e5',
  },
  repoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  repoAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f1f5f9',
  },
  repoTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
  },
  repoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  starButton: {
    padding: 4,
  },
  repoDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  repoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  activityRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginHorizontal: 24,
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
    justifyContent: 'center',
  },
  activityText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  boldText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  repoTitleActivity: {
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#0f172a',
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 20,
  },
});
