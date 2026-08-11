import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

import Icon from '@react-native-vector-icons/ionicons/static';

import { useDebounce } from '../../hooks/useDebounce';
import { useRecentSearches } from '../../hooks/useRecentSearches';

import {
  useSearchReposQuery,
  useSearchUsersQuery,
} from '../../store/searchApi';

import SkeletonCard from '../../components/search/SkeletonCard';

import type { SearchRepoItem, SearchUserItem } from '../../types/search';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../routes/types';

type SearchNavigationProp = NativeStackNavigationProp<AppStackParamList>;

const TABS = ['Repos', 'Users'] as const;

type TabType = (typeof TABS)[number];

type RepoSort = 'Best match' | 'Most stars' | 'Recently updated';

type UserSort =
  | 'Best match'
  | 'Most followers'
  | 'Most repositories'
  | 'Recently joined';

type RepoLanguage = 'All' | 'JavaScript' | 'TypeScript' | 'Python';

const REPO_SORT_OPTIONS: RepoSort[] = [
  'Best match',
  'Most stars',
  'Recently updated',
];

const USER_SORT_OPTIONS: UserSort[] = [
  'Best match',
  'Most followers',
  'Most repositories',
  'Recently joined',
];

const LANGUAGE_OPTIONS: RepoLanguage[] = [
  'All',
  'JavaScript',
  'TypeScript',
  'Python',
];

/*
 * GitHub repository search sorting.
 */
const REPO_SORT_MAP: Record<RepoSort, string | undefined> = {
  'Best match': undefined,
  'Most stars': 'stars',
  'Recently updated': 'updated',
};

/*
 * GitHub user search sorting.
 *
 * Best match -> no sort
 * Most followers -> followers
 * Most repositories -> repositories
 * Recently joined -> joined
 */
const USER_SORT_MAP: Record<UserSort, string | undefined> = {
  'Best match': undefined,
  'Most followers': 'followers',
  'Most repositories': 'repositories',
  'Recently joined': 'joined',
};
function formatNumber(num: number): string {
  return Number(num || 0).toLocaleString('en-US');
}

/*
 * The API normally returns:
 *
 * {
 *   total_count,
 *   items
 * }
 *
 * But this normalization also protects the UI if the user endpoint
 * returns a slightly different shape such as:
 *
 * {
 *   users: [...]
 * }
 *
 * or:
 *
 * [...]
 */
function normalizeSearchResponse(response: any) {
  if (!response) {
    return {
      totalCount: 0,
      items: [],
    };
  }

  if (Array.isArray(response)) {
    return {
      totalCount: response.length,
      items: response,
    };
  }

  const items =
    response.items ??
    response.users ??
    response.results ??
    response.data?.items ??
    response.data?.users ??
    [];

  const totalCount =
    response.total_count ??
    response.totalCount ??
    response.data?.total_count ??
    response.data?.totalCount ??
    items.length;

  return {
    totalCount: Number(totalCount || 0),
    items: Array.isArray(items) ? items : [],
  };
}

export default function Search() {
  const navigation = useNavigation<SearchNavigationProp>();

  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState<TabType>('Repos');

  const [page, setPage] = useState(1);

  const [repoSort, setRepoSort] = useState<RepoSort>('Best match');

  const [repoLanguage, setRepoLanguage] = useState<RepoLanguage>('All');

  const [pendingRepoSort, setPendingRepoSort] =
    useState<RepoSort>('Best match');

  const [pendingRepoLanguage, setPendingRepoLanguage] =
    useState<RepoLanguage>('All');

  const [userSort, setUserSort] = useState<UserSort>('Best match');

  const [pendingUserSort, setPendingUserSort] =
    useState<UserSort>('Best match');

  const debouncedQuery = useDebounce(searchQuery, 400);

  const { recentSearches, saveRecent, clearRecents } = useRecentSearches();

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  /*
   * Slightly taller sheet.
   *
   * The previous 50%-65% sheet was too small once the action button
   * and system/app bottom tab bar were taken into account.
   */
  const snapPoints = useMemo(() => ['68%', '82%'], []);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, activeTab, repoSort, repoLanguage, userSort]);

  const reposResult = useSearchReposQuery(
    {
      q: debouncedQuery,
      sort: REPO_SORT_MAP[repoSort],
      per_page: 20,
      page,
      language: repoLanguage,
    },
    {
      skip: !debouncedQuery || activeTab !== 'Repos',
    },
  );

  const usersResult = useSearchUsersQuery(
    {
      q: debouncedQuery,
      sort: USER_SORT_MAP[userSort],
      per_page: 20,
      page,
    },
    {
      skip: !debouncedQuery || activeTab !== 'Users',
    },
  );

  const activeResult = activeTab === 'Repos' ? reposResult : usersResult;

  const { data, isLoading, isFetching } = activeResult;

  const { totalCount, items } = useMemo(
    () => normalizeSearchResponse(data),
    [data],
  );

  const hasMore = items.length < totalCount;

  const filterSortOptions =
    activeTab === 'Repos' ? REPO_SORT_OPTIONS : USER_SORT_OPTIONS;

  const handlePresentModalPress = useCallback(() => {
    Keyboard.dismiss();

    if (activeTab === 'Repos') {
      setPendingRepoSort(repoSort);
      setPendingRepoLanguage(repoLanguage);
    } else {
      setPendingUserSort(userSort);
    }

    /*
     * Let the keyboard close first.
     * This prevents the keyboard from competing with the bottom sheet.
     */
    requestAnimationFrame(() => {
      bottomSheetRef.current?.present();
    });
  }, [activeTab, repoSort, repoLanguage, userSort]);

  const handleCloseModalPress = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleApplyFilters = useCallback(() => {
    if (activeTab === 'Repos') {
      setRepoSort(pendingRepoSort);

      setRepoLanguage(pendingRepoLanguage);
    } else {
      setUserSort(pendingUserSort);
    }

    setPage(1);

    bottomSheetRef.current?.dismiss();
  }, [activeTab, pendingRepoSort, pendingRepoLanguage, pendingUserSort]);

  const handleTabChange = useCallback(
    (tab: TabType) => {
      if (tab === activeTab) {
        return;
      }

      /*
       * Change tab immediately.
       *
       * We don't wait for the API.
       */
      setActiveTab(tab);
      setPage(1);

      /*
       * Close filter sheet if it is open.
       */
      bottomSheetRef.current?.dismiss();
    },
    [activeTab],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const loadNextPage = useCallback(() => {
    if (!isFetching && hasMore) {
      setPage(previous => previous + 1);
    }
  }, [isFetching, hasMore]);

  const handleRecentTap = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    const query = searchQuery.trim();

    if (query) {
      saveRecent(query);
    }
  }, [searchQuery, saveRecent]);

  const resultTypeLabel = activeTab === 'Repos' ? 'repositories' : 'users';

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {TABS.map(tab => {
        const isActive = activeTab === tab;

        return (
          <TouchableOpacity
            key={tab}
            activeOpacity={0.75}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Icon
              name={tab === 'Repos' ? 'code-slash-outline' : 'people-outline'}
              size={16}
              color={isActive ? '#FFFFFF' : '#64748B'}
            />

            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      {recentSearches.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Icon name="time-outline" size={16} color="#9ca3af" />

            <Text style={styles.sectionTitle}>RECENT SEARCHES</Text>

            <TouchableOpacity
              onPress={clearRecents}
              style={styles.clearRecentButton}
            >
              <Text style={styles.clearRecentText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pillContainer}>
            {recentSearches.map(search => (
              <TouchableOpacity
                key={search}
                style={styles.pillOutline}
                onPress={() => handleRecentTap(search)}
              >
                <Text style={styles.pillOutlineText}>{search}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View
        style={[
          styles.searchHintCard,
          recentSearches.length > 0 && styles.searchHintCardWithMargin,
        ]}
      >
        <View style={styles.searchHintIcon}>
          <Icon
            name={activeTab === 'Repos' ? 'logo-github' : 'people-outline'}
            size={24}
            color="#475569"
          />
        </View>

        <View style={styles.searchHintContent}>
          <Text style={styles.searchHintTitle}>
            Search {activeTab === 'Repos' ? 'repositories' : 'users'}
          </Text>

          <Text style={styles.searchHintText}>
            {activeTab === 'Repos'
              ? 'Find repositories by name, language, stars or recent activity.'
              : 'Find GitHub users by username, name or profile information.'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.resultsContainer}>
      {[1, 2, 3, 4, 5].map(item => (
        <SkeletonCard key={item} />
      ))}
    </View>
  );

  const renderNoResults = () => (
    <View style={styles.noResultsContainer}>
      <View style={styles.noResultsIcon}>
        <Icon name="search-outline" size={30} color="#94A3B8" />
      </View>

      <Text style={styles.noResultsTitle}>No {resultTypeLabel} found</Text>

      <Text style={styles.noResultsSubtitle}>
        Try a different search term or adjust your filters.
      </Text>
    </View>
  );

  const renderRepoItem = ({ item }: { item: SearchRepoItem }) => (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.7}
      onPress={() => {
        saveRecent(searchQuery.trim());

        navigation.navigate('Details', {
          owner: item.owner.login,
          repo: item.name,
        });
      }}
    >
      <Image
        source={{
          uri: item.owner?.avatar_url,
        }}
        style={styles.resultAvatar}
      />

      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.full_name}
        </Text>

        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.language || 'Unknown'} · {formatNumber(item.stargazers_count)}{' '}
          stars
        </Text>
      </View>

      <View style={styles.resultBadge}>
        <Text style={styles.resultBadgeText}>Repo</Text>
      </View>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: SearchUserItem }) => (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.7}
      onPress={() => {
        if (searchQuery.trim()) {
          saveRecent(searchQuery.trim());
        }
      }}
    >
      <Image
        source={{
          uri: item.avatar_url,
        }}
        style={[styles.resultAvatar, styles.userAvatar]}
      />

      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.login}
        </Text>

        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.type || 'GitHub User'}
        </Text>
      </View>

      <View style={[styles.resultBadge, styles.userBadge]}>
        <Text style={[styles.resultBadgeText, styles.userBadgeText]}>User</Text>
      </View>
    </TouchableOpacity>
  );

  const renderResults = () => {
    if (isLoading) {
      return renderSkeleton();
    }

    if (!isLoading && items.length === 0) {
      return renderNoResults();
    }

    const renderItem = (
      activeTab === 'Repos' ? renderRepoItem : renderUserItem
    ) as any;

    const keyExtractor =
      activeTab === 'Repos'
        ? (item: any) => `repo-${item.id}`
        : (item: any) => `user-${item.id || item.login}`;

    return (
      <View style={styles.resultsContainer}>
        {isFetching && page === 1 && !isLoading && (
          <View style={styles.fetchingBar}>
            <ActivityIndicator size="small" color="#111827" />
          </View>
        )}

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {formatNumber(totalCount)} {resultTypeLabel}
          </Text>

          <View style={styles.activeFilterLabel}>
            <Icon name="options-outline" size={13} color="#64748B" />

            <Text style={styles.activeFilterText}>
              {activeTab === 'Repos' ? repoSort : userSort}
            </Text>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onEndReached={loadNextPage}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            isFetching && page > 1 ? (
              <ActivityIndicator
                size="small"
                color="#9CA3AF"
                style={styles.footerSpinner}
              />
            ) : null
          }
        />
      </View>
    );
  };

  const renderFilterSheet = () => (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDismissOnClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.bottomSheetHandle}
      /*
       * Gives the sheet additional room above the
       * application's bottom navigation.
       */
      bottomInset={Platform.OS === 'ios' ? 8 : 4}
    >
      <BottomSheetView style={styles.bottomSheetContent}>
        {/* Header */}
        <View style={styles.bottomSheetHeader}>
          <View>
            <Text style={styles.bottomSheetTitle}>Filter results</Text>

            <Text style={styles.bottomSheetSubtitle}>
              {activeTab === 'Repos'
                ? 'Customize repository results'
                : 'Customize user results'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleCloseModalPress}
            style={styles.closeButton}
          >
            <Icon name="close" size={21} color="#1f2937" />
          </TouchableOpacity>
        </View>

        {/* Sort */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>SORT BY</Text>

          <View style={styles.filterPillContainer}>
            {filterSortOptions.map(option => {
              const isActive =
                activeTab === 'Repos'
                  ? pendingRepoSort === option
                  : pendingUserSort === option;

              return (
                <Pressable
                  key={option}
                  style={[
                    styles.filterPill,
                    isActive && styles.filterPillActive,
                  ]}
                  onPress={() => {
                    if (activeTab === 'Repos') {
                      setPendingRepoSort(option as RepoSort);
                    } else {
                      setPendingUserSort(option as UserSort);
                    }
                  }}
                >
                  {isActive && <Icon name="checkmark" size={15} color="#fff" />}

                  <Text
                    style={[
                      styles.filterPillText,
                      isActive && styles.filterPillTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Repository language */}
        {activeTab === 'Repos' && (
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>LANGUAGE</Text>

            <View style={styles.filterPillContainer}>
              {LANGUAGE_OPTIONS.map(option => {
                const isActive = pendingRepoLanguage === option;

                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.filterPill,
                      isActive && styles.filterPillActive,
                    ]}
                    onPress={() => setPendingRepoLanguage(option)}
                  >
                    {isActive && (
                      <Icon name="checkmark" size={15} color="#fff" />
                    )}

                    <Text
                      style={[
                        styles.filterPillText,
                        isActive && styles.filterPillTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Spacer */}
        <View style={styles.sheetSpacer} />

        {/* Fixed action area */}
        <View style={styles.applyActionContainer}>
          <TouchableOpacity
            style={styles.applyFiltersButton}
            activeOpacity={0.85}
            onPress={handleApplyFilters}
          >
            <Text style={styles.applyFiltersText}>Apply filters</Text>

            <Icon name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <BottomSheetModalProvider>
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Search</Text>

            <TouchableOpacity
              style={styles.filterButton}
              onPress={handlePresentModalPress}
            >
              <Icon name="options-outline" size={23} color="#1f2937" />

              {/* Active filter indicator */}
              {(activeTab === 'Repos'
                ? repoSort !== 'Best match' || repoLanguage !== 'All'
                : userSort !== 'Best match') && (
                <View style={styles.filterDot} />
              )}
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchBarContainer}>
            <Icon
              name="search"
              size={20}
              color="#9ca3af"
              style={styles.searchIcon}
            />

            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === 'Repos' ? 'Search repositories' : 'Search users'
              }
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearIcon}
              >
                <Icon name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          {renderTabs()}

          {/* Fetching indicator */}
          {isFetching && !isLoading && page === 1 && (
            <View style={styles.fetchingBar}>
              <ActivityIndicator size="small" color="#111827" />
            </View>
          )}

          {/* Content */}
          {debouncedQuery ? renderResults() : renderEmptyState()}

          {/* Filter sheet */}
          {renderFilterSheet()}
        </SafeAreaView>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },

  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },

  filterDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#111827',
  },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },

  searchIcon: {
    marginRight: 8,
  },

  clearIcon: {
    marginLeft: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    height: '100%',
  },

  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
  },

  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  tabButtonActive: {
    backgroundColor: '#111827',
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },

  tabTextActive: {
    color: '#FFFFFF',
  },

  fetchingBar: {
    alignItems: 'center',
    paddingBottom: 8,
  },

  emptyStateContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginLeft: 6,
    letterSpacing: 0.5,
    flex: 1,
  },

  clearRecentButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  clearRecentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  pillOutline: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },

  pillOutlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },

  searchHintCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },

  searchHintCardWithMargin: {
    marginTop: 28,
  },

  searchHintIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  searchHintContent: {
    flex: 1,
  },

  searchHintTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
  },

  searchHintText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },

  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },

  activeFilterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  activeFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },

  listContent: {
    paddingBottom: 100,
  },

  topSpinner: {
    marginBottom: 8,
  },

  footerSpinner: {
    paddingVertical: 18,
  },

  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  resultAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },

  userAvatar: {
    borderRadius: 21,
  },

  resultInfo: {
    flex: 1,
    minWidth: 0,
  },

  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },

  resultSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },

  resultBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginLeft: 8,
  },

  resultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },

  userBadge: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },

  userBadgeText: {
    color: '#1D4ED8',
  },

  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  noResultsIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  noResultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },

  noResultsSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },

  bottomSheetHandle: {
    backgroundColor: '#CBD5E1',
    width: 42,
    height: 4,
  },

  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
  },

  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 26,
  },

  bottomSheetTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#111827',
  },

  bottomSheetSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterSection: {
    marginBottom: 24,
  },

  filterSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 12,
    letterSpacing: 0.8,
  },

  filterPillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  filterPill: {
    minHeight: 40,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  filterPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },

  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  filterPillTextActive: {
    color: '#FFFFFF',
  },

  sheetSpacer: {
    flex: 1,
  },

  /*
   * This is the important fix for the Apply button.
   *
   * It reserves space at the bottom of the sheet so the application's
   * bottom tab navigator cannot visually cover the button.
   */
  applyActionContainer: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 24,
    backgroundColor: '#FFFFFF',
  },

  applyFiltersButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  applyFiltersText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
