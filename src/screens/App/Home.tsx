import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';

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

import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FontAwesome6 from '@react-native-vector-icons/fontawesome6/static';

import { useAppSelector } from '../../store';
import { api } from '../../utils/api';
import { timeAgo } from '../../utils/timeHelper';

import {
  SkeletonRepoCard,
  SkeletonActivityRow,
} from '../../components/home/Skeletons';

import { AnimatedRepoCard } from '../../components/home/AnimatedRepoCard';
import { Toast } from '../../components/home/Toast';

interface Repo {
  id: number;

  full_name: string;
  name: string;

  owner: {
    login: string;
    avatar_url: string;
  };

  description: string | null;
  language: string | null;

  stargazers_count: number;
  forks_count: number;

  created_at?: string;
  updated_at?: string;
  pushed_at?: string;

  open_issues_count?: number;
  watchers_count?: number;

  html_url?: string;
}

interface ActivityEvent {
  id: string;
  type: string;

  actor: {
    login: string;
    avatar_url: string;
  };

  repo: {
    name: string;
  };

  created_at: string;

  payload?: any;
}

interface SearchRepositoriesResponse {
  total_count?: number;
  incomplete_results?: boolean;
  items?: Repo[];
}

const TRENDING_CATEGORIES = [
  {
    name: 'AI',

    queries: [
      'topic:ai',
      'topic:machine-learning',
      'topic:llm',
      'topic:generative-ai',
    ],
  },

  {
    name: 'Web',

    queries: [
      'topic:react',
      'topic:nextjs',
      'topic:typescript',
      'topic:javascript',
    ],
  },

  {
    name: 'Mobile',

    queries: [
      'topic:react-native',
      'topic:flutter',
      'topic:android',
      'topic:ios',
    ],
  },

  {
    name: 'Backend',

    queries: ['topic:nodejs', 'topic:python', 'topic:golang', 'topic:rust'],
  },

  {
    name: 'DevOps',

    queries: [
      'topic:docker',
      'topic:kubernetes',
      'topic:devops',
      'topic:terraform',
    ],
  },

  {
    name: 'Open Source',

    queries: [
      'topic:opensource',
      'topic:developer-tools',
      'topic:cli',
      'topic:github',
    ],
  },
];

const getDateDaysAgo = (days: number): string => {
  const date = new Date();

  date.setDate(date.getDate() - days);

  return date.toISOString().split('T')[0];
};

const getDailySeed = (): number => {
  const date = new Date();

  const dateString = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  ].join('-');

  let hash = 0;

  for (let index = 0; index < dateString.length; index++) {
    hash = (hash << 5) - hash + dateString.charCodeAt(index);

    hash |= 0;
  }

  return Math.abs(hash);
};

const dailyShuffle = <T,>(items: T[], seed: number): T[] => {
  const result = [...items];

  let value = seed;

  for (let index = result.length - 1; index > 0; index--) {
    value = (value * 9301 + 49297) % 233280;

    const randomValue = value / 233280;

    const targetIndex = Math.floor(randomValue * (index + 1));

    [result[index], result[targetIndex]] = [result[targetIndex], result[index]];
  }

  return result;
};

const normalizeRepoResult = (response: any): Repo[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  return [];
};

const calculateTrendingScore = (repo: Repo, dailySeed: number): number => {
  const stars = Number(repo.stargazers_count || 0);

  const forks = Number(repo.forks_count || 0);

  const starScore = Math.log10(stars + 1) * 25;

  const forkScore = Math.log10(forks + 1) * 10;

  let freshnessScore = 0;

  if (repo.created_at) {
    const createdTime = new Date(repo.created_at).getTime();

    const ageDays = Math.max(
      0,
      (Date.now() - createdTime) / (1000 * 60 * 60 * 24),
    );

    freshnessScore = Math.max(0, 30 - ageDays);
  }

  let activityScore = 0;

  if (repo.pushed_at) {
    const pushedTime = new Date(repo.pushed_at).getTime();

    const daysSincePush = Math.max(
      0,
      (Date.now() - pushedTime) / (1000 * 60 * 60 * 24),
    );

    activityScore = Math.max(0, 20 - daysSincePush);
  }

  const rotation = Math.abs(repo.id * 31 + dailySeed) % 100;

  const rotationScore = (rotation / 100) * 8;

  return starScore + forkScore + freshnessScore + activityScore + rotationScore;
};

export default function Home() {
  const navigation = useNavigation<any>();

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

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const login = user?.login || 'adityas-ops';

      const [starredRes, eventsRes] = await Promise.all([
        api.get<Repo[]>('/user/starred'),

        api.get<ActivityEvent[]>(`/users/${login}/events`),
      ]);

      if (!isMounted.current) {
        return;
      }

      setStarredRepos(starredRes);

      setActivities(eventsRes);

      const newStarredSet = new Set(starredRes.map(repo => repo.full_name));

      setStarredSet(newStarredSet);
    } catch (error) {
      console.warn('Error fetching user data:', error);
    }
  }, [user]);

  const fetchTrending = useCallback(async () => {
    try {
      const dailySeed = getDailySeed();

      const categoryCount = TRENDING_CATEGORIES.length;

      const primaryIndex = dailySeed % categoryCount;

      const secondaryIndex = (dailySeed * 7 + 3) % categoryCount;

      const tertiaryIndex = (dailySeed * 13 + 5) % categoryCount;

      const selectedCategories = [
        TRENDING_CATEGORIES[primaryIndex],

        TRENDING_CATEGORIES[secondaryIndex],

        TRENDING_CATEGORIES[tertiaryIndex],
      ].filter(
        (category, index, array) =>
          array.findIndex(item => item.name === category.name) === index,
      );

      /* ---------------------------------------------------------------- */
      /* Different time windows                                          */
      /* ---------------------------------------------------------------- */

      const date7 = getDateDaysAgo(7);

      const date14 = getDateDaysAgo(14);

      const date30 = getDateDaysAgo(30);

      /* ---------------------------------------------------------------- */
      /* Build queries                                                    */
      /* ---------------------------------------------------------------- */

      const queries: string[] = [];

      selectedCategories.forEach(category => {
        const categoryQueries = dailyShuffle(
          category.queries,
          dailySeed + category.name.length,
        ).slice(0, 2);

        categoryQueries.forEach(topic => {
          /*
           * Very new repositories.
           */
          queries.push(`${topic} created:>${date7}`);

          /*
           * Growing repositories.
           */
          queries.push(`${topic} created:>${date14}`);

          /*
           * Recently active repositories.
           */
          queries.push(`${topic} pushed:>${date7}`);
        });
      });

      /*
       * General searches.
       *
       * This catches repositories without useful topics.
       */
      queries.push(`created:>${date7}`);

      queries.push(`created:>${date14}`);

      queries.push(`created:>${date30}`);

      const uniqueQueries = [...new Set(queries)].slice(0, 12);

      /* ---------------------------------------------------------------- */
      /* Fetch candidates                                                 */
      /* ---------------------------------------------------------------- */

      const responses = await Promise.allSettled(
        uniqueQueries.map(async query => {
          const response = await api.get<SearchRepositoriesResponse>(
            '/search/repositories',
            {
              params: {
                q: query,
                sort: 'stars',
                order: 'desc',
                per_page: 30,
              },
            },
          );

          return normalizeRepoResult(response);
        }),
      );

      /* ---------------------------------------------------------------- */
      /* Collect candidates                                               */
      /* ---------------------------------------------------------------- */

      const candidates: Repo[] = [];

      responses.forEach(result => {
        if (result.status === 'fulfilled') {
          candidates.push(...result.value);
        }
      });

      /* ---------------------------------------------------------------- */
      /* Deduplicate                                                      */
      /* ---------------------------------------------------------------- */

      const uniqueRepos = new Map<string, Repo>();

      candidates.forEach(repo => {
        if (!repo?.full_name) {
          return;
        }

        if (!uniqueRepos.has(repo.full_name)) {
          uniqueRepos.set(repo.full_name, repo);
        }
      });

      const allCandidates = Array.from(uniqueRepos.values());

      /* ---------------------------------------------------------------- */
      /* Score                                                             */
      /* ---------------------------------------------------------------- */

      const scoredRepos = allCandidates.map(repo => ({
        repo,

        score: calculateTrendingScore(repo, dailySeed),
      }));

      scoredRepos.sort((a, b) => b.score - a.score);

      /* ---------------------------------------------------------------- */
      /* Larger candidate pool                                            */
      /* ---------------------------------------------------------------- */

      const candidatePool = scoredRepos.slice(0, 80).map(item => item.repo);

      /* ---------------------------------------------------------------- */
      /* Daily rotation                                                   */
      /* ---------------------------------------------------------------- */

      const shuffled = dailyShuffle(candidatePool, dailySeed);

      /* ---------------------------------------------------------------- */
      /* Language diversity                                               */
      /* ---------------------------------------------------------------- */

      const finalRepos: Repo[] = [];

      const languageCount = new Map<string, number>();

      for (const repo of shuffled) {
        if (finalRepos.length >= 10) {
          break;
        }

        const language = repo.language || 'Other';

        const currentCount = languageCount.get(language) || 0;

        /*
         * Maximum three repositories
         * from the same language.
         */
        if (currentCount >= 3) {
          continue;
        }

        finalRepos.push(repo);

        languageCount.set(language, currentCount + 1);
      }

      /* ---------------------------------------------------------------- */
      /* Fallback                                                         */
      /* ---------------------------------------------------------------- */

      if (finalRepos.length < 10) {
        for (const repo of candidatePool) {
          if (finalRepos.length >= 10) {
            break;
          }

          const exists = finalRepos.some(
            item => item.full_name === repo.full_name,
          );

          if (!exists) {
            finalRepos.push(repo);
          }
        }
      }

      if (isMounted.current) {
        setTrendingRepos(finalRepos);
      }
    } catch (error) {
      console.warn('Error fetching daily trending repositories:', error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);

    await Promise.all([fetchData(), fetchTrending()]);

    if (isMounted.current) {
      setLoading(false);
    }
  }, [fetchData, fetchTrending]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    await Promise.all([fetchData(), fetchTrending()]);

    if (isMounted.current) {
      setRefreshing(false);
    }
  }, [fetchData, fetchTrending]);

  const currentRepos = activeTab === 'Starred' ? starredRepos : trendingRepos;

  const availableLanguages = useMemo(() => {
    const langs = new Set(
      currentRepos
        .map(repo => repo.language)
        .filter((lang): lang is string => Boolean(lang)),
    );

    return ['All', ...Array.from(langs)];
  }, [currentRepos]);

  useEffect(() => {
    if (!availableLanguages.includes(activeLanguage)) {
      setActiveLanguage('All');
    }
  }, [availableLanguages, activeLanguage]);

  const displayedRepos = useMemo(() => {
    if (activeLanguage === 'All') {
      return currentRepos;
    }

    return currentRepos.filter(repo => repo.language === activeLanguage);
  }, [currentRepos, activeLanguage]);

  const toggleStar = useCallback(
    async (repoFullName: string) => {
      const isStarred = starredSet.has(repoFullName);

      const newSet = new Set(starredSet);

      const previousStarredRepos = [...starredRepos];

      if (isStarred) {
        newSet.delete(repoFullName);

        setStarredRepos(prev =>
          prev.filter(repo => repo.full_name !== repoFullName),
        );
      } else {
        newSet.add(repoFullName);

        const repoToAdd = trendingRepos.find(
          repo => repo.full_name === repoFullName,
        );

        if (repoToAdd) {
          setStarredRepos(prev => [repoToAdd, ...prev]);
        }
      }

      setStarredSet(newSet);

      const [repoOwner, repoName] = repoFullName.split('/');

      try {
        if (isStarred) {
          await api.delete(`/user/starred/${repoOwner}/${repoName}`);

          setToastMsg({
            message: 'Unstarred successfully',
            type: 'success',
          });
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

          setToastMsg({
            message: 'Starred successfully',
            type: 'success',
          });
        }
      } catch (error: any) {
        console.warn('Failed to toggle star:', error);

        setStarredSet(starredSet);

        setStarredRepos(previousStarredRepos);

        if (error?.status === 404) {
          setToastMsg({
            message: 'Error: Repository not found or missing permissions',
            type: 'error',
          });
        } else {
          setToastMsg({
            message: 'Error toggling star',
            type: 'error',
          });
        }
      }
    },
    [starredSet, starredRepos, trendingRepos],
  );

  const getLanguageColor = useCallback((lang: string) => {
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
  }, []);

  const formatNumber = useCallback((num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }

    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}k`;
    }

    return num.toString();
  }, []);

  const renderRepo = useCallback(
    ({ item, index }: { item: Repo; index: number }) => {
      const isStarred = starredSet.has(item.full_name);

      return (
        <AnimatedRepoCard index={index}>
          <TouchableOpacity
            style={styles.repoCard}
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate('Details', {
                owner: item.owner?.login,

                repo: item.name,
              })
            }
          >
            <View style={styles.repoHeaderRow}>
              <Image
                source={{
                  uri: item.owner?.avatar_url,
                }}
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
                hitSlop={{
                  top: 10,
                  bottom: 10,
                  left: 10,
                  right: 10,
                }}
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
                      {
                        backgroundColor: getLanguageColor(item.language),
                      },
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
          </TouchableOpacity>
        </AnimatedRepoCard>
      );
    },
    [starredSet, navigation, toggleStar, getLanguageColor, formatNumber],
  );

  const getActivityDetails = useCallback((event: ActivityEvent) => {
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
          icon: 'yin-yang',
          color: '#64748b',
          bg: '#f1f5f9',
          text: 'interacted with',
        };
    }
  }, []);

  const renderActivity = useCallback(
    ({ item, index }: { item: ActivityEvent; index: number }) => {
      const details = getActivityDetails(item);

      return (
        <AnimatedRepoCard index={index}>
          <View style={styles.activityRow}>
            <View
              style={[
                styles.activityIconBox,
                {
                  backgroundColor: details.bg,
                },
              ]}
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

              <Text style={styles.activityTime}>
                {timeAgo(item.created_at)}
              </Text>
            </View>
          </View>
        </AnimatedRepoCard>
      );
    },
    [getActivityDetails],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* ------------------------------------------------------------------ */}
      {/* Toast                                                               */}
      {/* ------------------------------------------------------------------ */}

      {toastMsg && (
        <Toast
          message={toastMsg.message}
          type={toastMsg.type}
          onClose={() => setToastMsg(null)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}

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

          <TouchableOpacity
            onPress={() => {
              navigation.navigate('Inbox');
            }}
            style={styles.iconButton}
          >
            <FontAwesome6 name="bell" size={16} color="#0f172a" />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* THREE TABS                                                         */}
      {/* ------------------------------------------------------------------ */}

      <View style={styles.tabContainer}>
        {['Starred', 'Trending', 'Activity'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => {
              setActiveTab(tab as 'Starred' | 'Trending' | 'Activity');

              /*
               * Reset language whenever switching
               * between repository tabs.
               */
              if (tab === 'Activity') {
                setActiveLanguage('All');
              }
            }}
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

      {/* ------------------------------------------------------------------ */}
      {/* LANGUAGE FILTER                                                     */}
      {/* ------------------------------------------------------------------ */}

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

      {/* ------------------------------------------------------------------ */}
      {/* LOADING                                                             */}
      {/* ------------------------------------------------------------------ */}

      {loading ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'Activity'
            ? Array.from({
                length: 8,
              }).map((_, index) => <SkeletonActivityRow key={index} />)
            : Array.from({
                length: 5,
              }).map((_, index) => <SkeletonRepoCard key={index} />)}
        </ScrollView>
      ) : activeTab === 'Activity' ? (
        /* -------------------------------------------------------------- */
        /* ACTIVITY TAB                                                   */
        /* -------------------------------------------------------------- */

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
        /* -------------------------------------------------------------- */
        /* STARRED + TRENDING                                             */
        /* -------------------------------------------------------------- */

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

    shadowOffset: {
      width: 0,
      height: 2,
    },

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
    paddingBottom: 120,
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
