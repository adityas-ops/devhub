import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Share,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppStackParamList } from '../../routes/types';
import api from '../../utils/api';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import Markdown from 'react-native-markdown-display';
import { Buffer } from 'buffer';
import { Toast } from '../../components/home/Toast';

type DetailsRouteProp = RouteProp<AppStackParamList, 'Details'>;

type TabType = 'Files' | 'README' | 'Commits';

interface RepoMeta {
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  license?: { name: string };
  updated_at: string;
  open_issues_count: number;
  topics: string[];
  html_url: string;
  default_branch: string;
}

interface RepoContentItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  sha: string;
}

interface Branch {
  name: string;
}

/**
 * Preprocess markdown content to convert common HTML tags
 * into markdown equivalents so react-native-markdown-display
 * can render them properly.
 */
export function preprocessMarkdown(md: string): string {
  let result = md;

  // Convert <img> tags to markdown images
  result = result.replace(
    /<img\s+[^>]*?src=["']([^"']+)["'][^>]*?alt=["']([^"']*?)["'][^>]*?\/?>/gi,
    '![$2]($1)',
  );
  result = result.replace(
    /<img\s+[^>]*?alt=["']([^"']*?)["'][^>]*?src=["']([^"']+)["'][^>]*?\/?>/gi,
    '![$1]($2)',
  );
  result = result.replace(
    /<img\s+[^>]*?src=["']([^"']+)["'][^>]*?\/?>/gi,
    '![]($1)',
  );

  // Convert <a> tags to markdown links
  result = result.replace(
    /<a\s+[^>]*?href=["']([^"']+)["'][^>]*?>([\s\S]*?)<\/a>/gi,
    '[$2]($1)',
  );

  // Convert heading tags
  result = result.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  result = result.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  result = result.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  result = result.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  result = result.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  result = result.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

  // Convert <strong> and <b> to bold
  result = result.replace(
    /<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi,
    '**$1**',
  );

  // Convert <em> and <i> to italic
  result = result.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  // Convert <code> to inline code
  result = result.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Convert <br> / <br/> to newlines
  result = result.replace(/<br\s*\/?>/gi, '\n');

  // Convert <hr> to markdown horizontal rule
  result = result.replace(/<hr\s*\/?>/gi, '\n---\n');

  // Strip <p> tags but keep content
  result = result.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');

  // Strip <div> tags but keep content
  result = result.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');

  // Strip <span> tags but keep content
  result = result.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');

  // Convert <li> to list items
  result = result.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');

  // Strip <ul>, <ol>, <table>, <thead>, <tbody>, <tr>, <td>, <th> etc.
  result = result.replace(
    /<\/?(ul|ol|table|thead|tbody|tr|td|th|section|article|header|footer|nav|main|details|summary|figure|figcaption|picture|source|video|audio)[^>]*>/gi,
    '\n',
  );

  // Strip any remaining HTML tags
  result = result.replace(/<\/?[^>]+(>|$)/g, '');

  // Clean up excessive newlines
  result = result.replace(/\n{4,}/g, '\n\n\n');

  return result.trim();
}

// Custom markdown styles
export const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 15,
    color: '#24292e',
    lineHeight: 24,
  },
  heading1: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  heading2: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#111827',
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 12,
  },
  code_inline: {
    backgroundColor: '#f3f4f6',
    color: '#d73a49',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  fence: {
    backgroundColor: '#f6f8fa',
    padding: 12,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  code_block: {
    backgroundColor: '#f6f8fa',
    padding: 12,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: '#d1d5db',
    paddingLeft: 12,
    marginVertical: 8,
    backgroundColor: '#f9fafb',
    paddingVertical: 4,
  },
  link: {
    color: '#2563eb',
  },
  image: {
    width: 300,
    height: 200,
  },
  list_item: {
    marginVertical: 4,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  hr: {
    backgroundColor: '#e5e7eb',
    height: 1,
    marginVertical: 16,
  },
  strong: {
    fontWeight: '700' as const,
  },
  em: {
    fontStyle: 'italic' as const,
  },
  table: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginVertical: 8,
  },
  thead: {
    backgroundColor: '#f3f4f6',
  },
  th: {
    padding: 8,
    fontWeight: '600' as const,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  td: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
});

export default function Details() {
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation<any>();
  const { owner, repo } = route.params;

  const [activeTab, setActiveTab] = useState<TabType>('Files');

  // Data states
  const [meta, setMeta] = useState<RepoMeta | null>(null);
  const [readme, setReadme] = useState<string>('');
  const [contents, setContents] = useState<RepoContentItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Interaction states
  const [loading, setLoading] = useState(true);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [pathStack, setPathStack] = useState<string[]>(['']);
  const [isStarred, setIsStarred] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  // Memoize preprocessed readme
  const processedReadme = useMemo(() => preprocessMarkdown(readme), [readme]);

  const fetchRepoData = useCallback(
    async (branch?: string) => {
      setLoading(true);
      try {
        const metaRes = await api.get<RepoMeta>(`/repos/${owner}/${repo}`);
        setMeta(metaRes);

        const targetBranch = branch || metaRes.default_branch;
        if (!currentBranch) {
          setCurrentBranch(targetBranch);
        }

        try {
          await api.get(`/user/starred/${owner}/${repo}`, {
            skipAuth: false,
            requireRawResponse: true,
          });
          setIsStarred(true);
        } catch (err: any) {
          if (err.status === 404) setIsStarred(false);
        }

        const [readmeRes, contentsRes, branchesRes] = await Promise.all([
          api
            .get(`/repos/${owner}/${repo}/readme?ref=${targetBranch}`)
            .catch(() => null),
          api
            .get<RepoContentItem[]>(
              `/repos/${owner}/${repo}/contents?ref=${targetBranch}`,
            )
            .catch(() => []),
          api.get<Branch[]>(`/repos/${owner}/${repo}/branches`).catch(() => []),
        ]);

        if (readmeRes && readmeRes.content) {
          const decoded = Buffer.from(readmeRes.content, 'base64').toString(
            'utf-8',
          );
          setReadme(decoded);
        } else {
          setReadme('*No README found.*');
        }

        const sortedContents = (
          Array.isArray(contentsRes) ? contentsRes : []
        ).sort((a, b) => {
          if (a.type === 'dir' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });
        setContents(sortedContents);
        setBranches(branchesRes);
      } catch (err) {
        console.warn('fetchRepoData error:', err);
      } finally {
        setLoading(false);
      }
    },
    [owner, repo, currentBranch],
  );

  useEffect(() => {
    fetchRepoData();
  }, [fetchRepoData]);

  const fetchContentsForPath = useCallback(
    async (path: string) => {
      setLoading(true);
      try {
        const res = await api.get<RepoContentItem[]>(
          `/repos/${owner}/${repo}/contents/${path}?ref=${currentBranch}`,
        );
        const sortedContents = (Array.isArray(res) ? res : []).sort((a, b) => {
          if (a.type === 'dir' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });
        setContents(sortedContents);
      } catch (err) {
        console.warn('fetchContents error:', err);
      } finally {
        setLoading(false);
      }
    },
    [owner, repo, currentBranch],
  );

  const handleItemPress = (item: RepoContentItem) => {
    if (item.type === 'dir') {
      const newPath = item.path;
      setPathStack([...pathStack, newPath]);
      fetchContentsForPath(newPath);
    } else {
      navigation.navigate('CodeViewer', {
        owner,
        repo,
        path: item.path,
        sha: item.sha,
        branch: currentBranch,
      });
    }
  };

  const handleBackInTree = () => {
    if (pathStack.length > 1) {
      const newStack = [...pathStack];
      newStack.pop();
      setPathStack(newStack);
      const prevPath = newStack[newStack.length - 1];
      if (prevPath === '') {
        fetchRepoData(currentBranch);
      } else {
        fetchContentsForPath(prevPath);
      }
    }
  };

  const toggleStar = async () => {
    const prevStarred = isStarred;
    setIsStarred(!isStarred);
    try {
      if (prevStarred) {
        await api.delete(`/user/starred/${owner}/${repo}`, {
          requireRawResponse: true,
        });
      } else {
        await api.put(`/user/starred/${owner}/${repo}`, undefined, {
          requireRawResponse: true,
        });
      }
    } catch (err) {
      setIsStarred(prevStarred);
    }
  };

  const shareRepo = async () => {
    if (!meta) return;
    try {
      await Share.share({
        message: `Check out ${owner}/${repo} on GitHub: ${meta.html_url}`,
        url: meta.html_url,
      });
    } catch (error: any) {
      console.warn('Share error:', error.message);
    }
  };

  const currentPathDisplay =
    pathStack[pathStack.length - 1] === ''
      ? 'root'
      : pathStack[pathStack.length - 1];

  // The tabs component is extracted so it can be used as a sticky header
  const TABS_INDEX = 1; // Index in the ScrollView children (0=meta, 1=tabs, 2=content)

  return (
    <BottomSheetModalProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Fixed Header */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {owner}/{repo}
        </Text>
        <TouchableOpacity style={styles.iconBtn} onPress={shareRepo}>
          <Ionicons name="share-social-outline" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Scrollable content with sticky tabs */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        stickyHeaderIndices={[TABS_INDEX]}
        showsVerticalScrollIndicator={true}
      >
        {/* Meta Info (index 0) */}
        {meta ? (
          <View style={styles.metaContainer}>
            <View style={styles.metaHeaderRow}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="logo-react" size={32} color="#8b5cf6" />
              </View>
              <Text style={styles.description}>{meta.description}</Text>
            </View>

            <View style={styles.topicsRow}>
              {meta.topics?.slice(0, 3).map(t => (
                <View key={t} style={styles.topicBadge}>
                  <Text style={styles.topicText}>{t}</Text>
                </View>
              ))}
            </View>

            <View style={styles.statsRow}>
              <TouchableOpacity
                style={[styles.statBadge, isStarred && styles.statBadgeStarred]}
                onPress={toggleStar}
              >
                <Ionicons
                  name={isStarred ? 'star' : 'star-outline'}
                  size={16}
                  color={isStarred ? '#b45309' : '#666'}
                />
                <Text
                  style={[styles.statText, isStarred && styles.statTextStarred]}
                >
                  {isStarred ? ' Starred' : ' Star'}
                </Text>
              </TouchableOpacity>

              <View style={styles.statBadge}>
                <Ionicons name="git-network-outline" size={16} color="#666" />
                <Text style={styles.statText}>
                  {' '}
                  {meta.forks_count >= 1000
                    ? (meta.forks_count / 1000).toFixed(1) + 'k'
                    : meta.forks_count}
                </Text>
              </View>

              <View style={styles.statBadge}>
                <Ionicons name="star-outline" size={16} color="#666" />
                <Text style={styles.statText}>
                  {' '}
                  {meta.stargazers_count >= 1000
                    ? (meta.stargazers_count / 1000).toFixed(1) + 'k'
                    : meta.stargazers_count}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.metaPlaceholder} />
        )}

        {/* Tabs (index 1 — sticky) */}
        <View style={styles.stickyTabsWrapper}>
          <View style={styles.tabsContainer}>
            {(['Files', 'README', 'Commits'] as TabType[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabBtn,
                  activeTab === tab && styles.tabBtnActive,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <View style={styles.tabInner}>
                  {tab === 'Files' && (
                    <Ionicons
                      name="document-outline"
                      size={14}
                      color={activeTab === tab ? '#111827' : '#9ca3af'}
                    />
                  )}
                  {tab === 'README' && (
                    <Ionicons
                      name="book-outline"
                      size={14}
                      color={activeTab === tab ? '#111827' : '#9ca3af'}
                    />
                  )}
                  {tab === 'Commits' && (
                    <Ionicons
                      name="git-commit-outline"
                      size={14}
                      color={activeTab === tab ? '#111827' : '#9ca3af'}
                    />
                  )}
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab && styles.tabTextActive,
                    ]}
                  >
                    {' '}
                    {tab}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content Area (index 2) */}
        <View style={styles.contentArea}>
          {activeTab === 'Files' && (
            <View style={styles.filesContainer}>
              <View style={styles.branchRow}>
                <TouchableOpacity
                  style={styles.branchSelector}
                  onPress={() => {
                    if (branches.length === 0) {
                      setToastMessage('No branches available');
                      setToastVisible(true);
                    } else {
                      bottomSheetRef.current?.present();
                    }
                  }}
                >
                  <Text style={styles.branchText}>{currentBranch}</Text>
                  <Ionicons name="chevron-down" size={14} color="#666" />
                </TouchableOpacity>

                {pathStack.length > 1 && (
                  <TouchableOpacity
                    style={styles.backTreeBtn}
                    onPress={handleBackInTree}
                  >
                    <Ionicons
                      name="arrow-undo-outline"
                      size={16}
                      color="#666"
                    />
                    <Text style={styles.backTreeText}> Back</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.pathBreadcrumb}>{currentPathDisplay}</Text>

              {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 20 }} />
              ) : (
                <View>
                  {contents.map((item, index) => (
                    <React.Fragment key={item.sha + item.path}>
                      <TouchableOpacity
                        style={styles.fileRow}
                        onPress={() => handleItemPress(item)}
                      >
                        <Ionicons
                          name={item.type === 'dir' ? 'folder' : 'document'}
                          size={20}
                          color={item.type === 'dir' ? '#60a5fa' : '#94a3b8'}
                        />
                        <View style={styles.fileRowContent}>
                          <Text style={styles.fileName}>{item.name}</Text>
                        </View>
                      </TouchableOpacity>
                      {index < contents.length - 1 && (
                        <View style={styles.separator} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === 'README' && (
            <View style={styles.readmeContainer}>
              <Markdown
                style={markdownStyles}
                rules={{
                  image: (
                    node: any,
                    children: any,
                    parent: any,
                    styles: any,
                  ) => {
                    const { key, ...rest } = node.attributes;
                    return (
                      <Image
                        key={node.key}
                        style={markdownStyles.image}
                        source={{ uri: rest.src }}
                        accessibilityLabel={rest.alt || ''}
                        resizeMode="contain"
                      />
                    );
                  },
                }}
              >
                {processedReadme}
              </Markdown>
            </View>
          )}

          {activeTab === 'Commits' && (
            <View style={styles.emptyCenter}>
              <Text>Commits list coming soon...</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Branch Picker Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={props => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
          />
        )}
      >
        <View style={styles.sheetContainer}>
          <Text style={styles.sheetTitle}>Switch Branch</Text>
          <FlatList
            data={branches}
            keyExtractor={item => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sheetRow}
                onPress={() => {
                  setCurrentBranch(item.name);
                  setPathStack(['']);
                  bottomSheetRef.current?.close();
                  fetchRepoData(item.name);
                }}
              >
                <Text
                  style={[
                    styles.sheetRowText,
                    currentBranch === item.name && styles.sheetRowActive,
                  ]}
                >
                  {item.name}
                </Text>
                {currentBranch === item.name && (
                  <Ionicons name="checkmark" size={20} color="#000" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </BottomSheetModal>
      {toastVisible && (
        <Toast
          message={toastMessage}
          type="error"
          onClose={() => setToastVisible(false)}
        />
      )}
    </SafeAreaView>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  metaContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  metaPlaceholder: {
    height: 0,
  },
  metaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  description: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  topicBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  topicText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statBadgeStarred: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statTextStarred: {
    color: '#92400e',
  },
  stickyTabsWrapper: {
    backgroundColor: '#fafafa',
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 10,
    elevation: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#111827',
  },
  contentArea: {
    minHeight: 400,
  },
  filesContainer: {
    paddingHorizontal: 16,
  },
  branchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  branchSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#4b5563',
    marginRight: 4,
  },
  backTreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backTreeText: {
    fontSize: 14,
    color: '#666',
  },
  pathBreadcrumb: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  fileRowContent: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  readmeContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  emptyCenter: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetContainer: {
    flex: 1,
    padding: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sheetRowText: {
    fontSize: 16,
    color: '#374151',
  },
  sheetRowActive: {
    fontWeight: '700',
    color: '#111827',
  },
});
