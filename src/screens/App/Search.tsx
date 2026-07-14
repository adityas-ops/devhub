import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Pressable,
  Keyboard,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from '@react-native-vector-icons/ionicons/static';

import { useDebounce } from '../../hooks/useDebounce';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import {
  useSearchReposQuery,
  useSearchUsersQuery,
  useSearchTopicsQuery,
} from '../../store/searchApi';
import SkeletonCard from '../../components/search/SkeletonCard';
import type {
  SearchRepoItem,
  SearchUserItem,
  SearchTopicItem,
} from '../../types/search';

// ─── Constants ───
const TABS = ['Repos', 'Users', 'Topics'] as const;
type TabType = (typeof TABS)[number];

const SUGGESTED_TOPICS = [
  '#react',
  '#typescript',
  '#machine-learning',
  '#cli',
  '#android',
  '#swiftui',
  '#docker',
  '#graphql',
];

const SORT_OPTIONS = ['Best match', 'Most stars', 'Recently updated'];
const LANGUAGE_OPTIONS = ['All', 'JavaScript', 'TypeScript', 'Python'];

// Map display sort names to GitHub API sort params
const SORT_MAP: Record<string, string | undefined> = {
  'Best match': undefined,
  'Most stars': 'stars',
  'Recently updated': 'updated',
};

// ─── Helper: Format number with commas ───
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

// ─── Random color for user avatars fallback ───
const AVATAR_COLORS = [
  '#9333EA',
  '#10B981',
  '#EF4444',
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
];
function getColorForId(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

// ─── Component ───
export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('Repos');
  const [page, setPage] = useState(1);

  // Filter States
  const [activeSort, setActiveSort] = useState('Best match');
  const [activeLanguage, setActiveLanguage] = useState('All');

  // Pending filter states (only applied on "Apply filters")
  const [pendingSort, setPendingSort] = useState('Best match');
  const [pendingLanguage, setPendingLanguage] = useState('All');

  // Hooks
  const debouncedQuery = useDebounce(searchQuery, 400);
  const { recentSearches, saveRecent, clearRecents } = useRecentSearches();

  // Reset page when query, tab, or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, activeTab, activeSort, activeLanguage]);

  // ─── RTK Queries (skip when no query) ───
  const reposResult = useSearchReposQuery(
    {
      q: debouncedQuery,
      sort: SORT_MAP[activeSort],
      per_page: 20,
      page,
      language: activeLanguage,
    },
    { skip: !debouncedQuery || activeTab !== 'Repos' },
  );

  const usersResult = useSearchUsersQuery(
    {
      q: debouncedQuery,
      per_page: 20,
      page,
    },
    { skip: !debouncedQuery || activeTab !== 'Users' },
  );

  const topicsResult = useSearchTopicsQuery(
    {
      q: debouncedQuery,
      per_page: 20,
      page,
    },
    { skip: !debouncedQuery || activeTab !== 'Topics' },
  );

  // ─── Derived state based on active tab ───
  const activeResult = useMemo(() => {
    switch (activeTab) {
      case 'Repos':
        return reposResult;
      case 'Users':
        return usersResult;
      case 'Topics':
        return topicsResult;
    }
  }, [activeTab, reposResult, usersResult, topicsResult]);

  const { data, isLoading, isFetching } = activeResult;

  const totalCount = data?.total_count ?? 0;
  const items = data?.items ?? [];
  const hasMore = items.length < totalCount;

  // ─── Bottom Sheet ───
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['50%', '65%'], []);

  const handlePresentModalPress = useCallback(() => {
    Keyboard.dismiss();
    // Sync pending filters with current active filters when opening
    setPendingSort(activeSort);
    setPendingLanguage(activeLanguage);
    bottomSheetRef.current?.present();
  }, [activeSort, activeLanguage]);

  const handleCloseModalPress = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleApplyFilters = useCallback(() => {
    setActiveSort(pendingSort);
    setActiveLanguage(pendingLanguage);
    bottomSheetRef.current?.dismiss();
  }, [pendingSort, pendingLanguage]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  // ─── Infinite Scroll ───
  const loadNextPage = useCallback(() => {
    if (!isFetching && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [isFetching, hasMore]);

  // ─── Recent search tap → populate search bar + save ───
  const handleRecentTap = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleTopicTap = useCallback((topic: string) => {
    setSearchQuery(topic);
  }, []);

  // Save query to recent searches when user submits
  const handleSearchSubmit = useCallback(() => {
    if (searchQuery.trim()) {
      saveRecent(searchQuery.trim());
    }
  }, [searchQuery, saveRecent]);

  // ─── Tab change handler ───
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  // ─── Result type label ───
  const resultTypeLabel = useMemo(() => {
    switch (activeTab) {
      case 'Repos':
        return 'repositories';
      case 'Users':
        return 'users';
      case 'Topics':
        return 'topics';
    }
  }, [activeTab]);

  // ─── Render: Tabs ───
  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {TABS.map(tab => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ─── Render: Empty state (no query yet) ───
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      {/* Recent Searches */}
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

      {/* Suggested Topics */}
      <View
        style={[
          styles.sectionHeader,
          { marginTop: recentSearches.length > 0 ? 24 : 0 },
        ]}
      >
        <Icon name="grid-outline" size={16} color="#9ca3af" />
        <Text style={styles.sectionTitle}>SUGGESTED TOPICS</Text>
      </View>
      <View style={styles.pillContainer}>
        {SUGGESTED_TOPICS.map(topic => (
          <TouchableOpacity
            key={topic}
            style={styles.pillPurple}
            onPress={() => handleTopicTap(topic)}
          >
            <Text style={styles.pillPurpleText}>{topic}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ─── Render: Skeleton loading ───
  const renderSkeleton = () => (
    <View style={styles.resultsContainer}>
      {[1, 2, 3, 4, 5].map(i => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );

  // ─── Render: No results state ───
  const renderNoResults = () => (
    <View style={styles.noResultsContainer}>
      <Icon name="search-outline" size={64} color="#D1D5DB" />
      <Text style={styles.noResultsTitle}>No results found</Text>
      <Text style={styles.noResultsSubtitle}>
        Try adjusting your search or filters to find what you're looking for.
      </Text>
    </View>
  );

  // ─── Render: Repo result card ───
  const renderRepoItem = ({ item }: { item: SearchRepoItem }) => (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.7}
      onPress={() => saveRecent(searchQuery.trim())}
    >
      <Image
        source={{ uri: item.owner.avatar_url }}
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

  // ─── Render: User result card ───
  const renderUserItem = ({ item }: { item: SearchUserItem }) => (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.7}
      onPress={() => saveRecent(searchQuery.trim())}
    >
      <Image source={{ uri: item.avatar_url }} style={styles.resultAvatar} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.login}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {item.type}
        </Text>
      </View>
      <View style={[styles.resultBadge, styles.userBadge]}>
        <Text style={[styles.resultBadgeText, styles.userBadgeText]}>User</Text>
      </View>
    </TouchableOpacity>
  );

  // ─── Render: Topic result card ───
  const renderTopicItem = ({ item }: { item: SearchTopicItem }) => (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.7}
      onPress={() => saveRecent(searchQuery.trim())}
    >
      <View
        style={[
          styles.resultIconWrapper,
          { backgroundColor: getColorForId(item.name.length) + '20' },
        ]}
      >
        <Icon
          name="pricetag"
          size={20}
          color={getColorForId(item.name.length)}
        />
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          #{item.name}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={2}>
          {item.short_description || item.display_name || 'No description'}
        </Text>
      </View>
      <View style={[styles.resultBadge, styles.topicBadge]}>
        <Text style={[styles.resultBadgeText, styles.topicBadgeText]}>
          Topic
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ─── Render: Results list ───
  const renderResults = () => {
    // Show skeleton on initial load
    if (isLoading) {
      return renderSkeleton();
    }

    // No results
    if (!isLoading && items.length === 0) {
      return renderNoResults();
    }

    // Pick the right renderItem based on active tab
    let renderItem: any;
    let keyExtractor: (item: any) => string;

    switch (activeTab) {
      case 'Repos':
        renderItem = renderRepoItem;
        keyExtractor = (item: SearchRepoItem) => `repo-${item.id}`;
        break;
      case 'Users':
        renderItem = renderUserItem;
        keyExtractor = (item: SearchUserItem) => `user-${item.id}`;
        break;
      case 'Topics':
        renderItem = renderTopicItem;
        keyExtractor = (item: SearchTopicItem) => `topic-${item.name}`;
        break;
    }

    return (
      <View style={styles.resultsContainer}>
        {/* Fetching indicator (for refetch / page load) */}
        {isFetching && page > 1 && (
          <ActivityIndicator
            size="small"
            color="#111827"
            style={styles.topSpinner}
          />
        )}

        <Text style={styles.resultsCount}>
          {formatNumber(totalCount)} {resultTypeLabel} found
        </Text>

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

  // ─── Main Return ───
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
              <Icon name="options-outline" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <Icon
              name="search"
              size={20}
              color="#9ca3af"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search repositories, users, topics"
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

          {/* Inline fetching indicator */}
          {isFetching && !isLoading && page === 1 && (
            <View style={styles.fetchingBar}>
              <ActivityIndicator size="small" color="#111827" />
            </View>
          )}

          {/* Content */}
          {debouncedQuery ? renderResults() : renderEmptyState()}

          {/* ─── Filter Bottom Sheet ─── */}
          <BottomSheetModal
            ref={bottomSheetRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={styles.bottomSheetBackground}
            handleIndicatorStyle={styles.bottomSheetHandle}
          >
            <BottomSheetView style={styles.bottomSheetContent}>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Filter results</Text>
                <TouchableOpacity
                  onPress={handleCloseModalPress}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#1f2937" />
                </TouchableOpacity>
              </View>

              {/* Sort By */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>SORT BY</Text>
                <View style={styles.filterPillContainer}>
                  {SORT_OPTIONS.map(option => (
                    <Pressable
                      key={option}
                      style={[
                        styles.filterPill,
                        pendingSort === option && styles.filterPillActive,
                      ]}
                      onPress={() => setPendingSort(option)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          pendingSort === option && styles.filterPillTextActive,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Language (only for Repos tab) */}
              {activeTab === 'Repos' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>LANGUAGE</Text>
                  <View style={styles.filterPillContainer}>
                    {LANGUAGE_OPTIONS.map(option => (
                      <Pressable
                        key={option}
                        style={[
                          styles.filterPill,
                          pendingLanguage === option && styles.filterPillActive,
                        ]}
                        onPress={() => setPendingLanguage(option)}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            pendingLanguage === option &&
                              styles.filterPillTextActive,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={{ flex: 1 }} />

              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={handleApplyFilters}
              >
                <Text style={styles.applyFiltersText}>Apply filters</Text>
              </TouchableOpacity>
            </BottomSheetView>
          </BottomSheetModal>
        </SafeAreaView>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 20,
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
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tabButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // ─── Empty State ───
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
  pillPurple: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#EBE8FF',
  },
  pillPurpleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4C1D95',
  },

  // ─── Results ───
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  fetchingBar: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  topSpinner: {
    marginBottom: 8,
  },
  footerSpinner: {
    paddingVertical: 16,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  resultIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
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
  topicBadge: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  topicBadgeText: {
    color: '#6D28D9',
  },

  // ─── No Results ───
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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

  // ─── Bottom Sheet ───
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
  },
  bottomSheetHandle: {
    backgroundColor: '#E5E7EB',
    width: 40,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSection: {
    marginBottom: 28,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  filterPillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  applyFiltersButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
