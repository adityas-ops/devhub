import React, {
  memo,
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
  Platform,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';

import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import Ionicons from '@react-native-vector-icons/ionicons/static';
import Markdown from 'react-native-markdown-display';
import { Buffer } from 'buffer';

import { AppStackParamList } from '../../routes/types';
import api from '../../utils/api';
import { Toast } from '../../components/home/Toast';

type DetailsRouteProp = RouteProp<AppStackParamList, 'Details'>;

type TabType = 'Files' | 'README';

interface RepoMeta {
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  license?: {
    name: string;
  };
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

/* -------------------------------------------------------------------------- */
/* Markdown                                                                   */
/* -------------------------------------------------------------------------- */

export function preprocessMarkdown(md: string): string {
  let result = md;

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

  result = result.replace(
    /<a\s+[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    '[$2]($1)',
  );

  result = result.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  result = result.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  result = result.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  result = result.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  result = result.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  result = result.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

  result = result.replace(
    /<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi,
    '**$1**',
  );

  result = result.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*');

  result = result.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  result = result.replace(/<br\s*\/?>/gi, '\n');
  result = result.replace(/<hr\s*\/?>/gi, '\n---\n');

  result = result.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');

  result = result.replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '\n$1\n');

  result = result.replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');

  result = result.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');

  result = result.replace(
    /<\/?(ul|ol|table|thead|tbody|tr|td|th|section|article|header|footer|nav|main|details|summary|figure|figcaption|picture|source|video|audio)[^>]*>/gi,
    '\n',
  );

  result = result.replace(/<\/?[^>]+(>|$)/g, '');
  result = result.replace(/\n{4,}/g, '\n\n\n');

  return result.trim();
}

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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const sortContents = (items: RepoContentItem[]): RepoContentItem[] => {
  return [...items].sort((a, b) => {
    if (a.type === 'dir' && b.type === 'file') {
      return -1;
    }

    if (a.type === 'file' && b.type === 'dir') {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });
};

/* -------------------------------------------------------------------------- */
/* Tab Header                                                                 */
/* -------------------------------------------------------------------------- */

interface TabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

const Tabs = memo(({ activeTab, onChange }: TabsProps) => {
  return (
    <View style={styles.stickyTabsWrapper}>
      <View style={styles.tabsContainer}>
        {(['Files', 'README'] as TabType[]).map(tab => {
          const isActive = activeTab === tab;

          return (
            <Pressable
              key={tab}
              style={({ pressed }) => [
                styles.tabBtn,
                isActive && styles.tabBtnActive,
                pressed && styles.pressed,
              ]}
              onPress={() => onChange(tab)}
            >
              <View style={styles.tabInner}>
                <Ionicons
                  name={tab === 'Files' ? 'document-outline' : 'book-outline'}
                  size={14}
                  color={isActive ? '#111827' : '#9ca3af'}
                />

                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {tab}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

Tabs.displayName = 'Tabs';

/* -------------------------------------------------------------------------- */
/* Files Tab                                                                  */
/* -------------------------------------------------------------------------- */

interface FilesTabProps {
  branches: Branch[];
  currentBranch: string;
  contents: RepoContentItem[];
  pathStack: string[];
  loading: boolean;
  onBranchPress: () => void;
  onItemPress: (item: RepoContentItem) => void;
  onBack: () => void;
  onRootPress: () => void;
}

const FilesTab = memo(
  ({
    branches,
    currentBranch,
    contents,
    pathStack,
    loading,
    onBranchPress,
    onItemPress,
    onBack,
    onRootPress,
  }: FilesTabProps) => {
    const currentPath =
      pathStack[pathStack.length - 1] === ''
        ? 'root'
        : pathStack[pathStack.length - 1];

    return (
      <View style={styles.filesContainer}>
        <View style={styles.branchRow}>
          <Pressable
            style={({ pressed }) => [
              styles.branchSelector,
              pressed && styles.pressed,
            ]}
            onPress={onBranchPress}
          >
            <Ionicons name="git-branch-outline" size={16} color="#4b5563" />

            <Text style={styles.branchText}>
              {currentBranch || 'Select branch'}
            </Text>

            <Ionicons name="chevron-down" size={14} color="#666" />
          </Pressable>

          {pathStack.length > 1 && (
            <TouchableOpacity style={styles.backTreeBtn} onPress={onBack}>
              <Ionicons name="arrow-undo-outline" size={16} color="#666" />

              <Text style={styles.backTreeText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>

        <Pressable onPress={onRootPress}>
          <Text style={styles.pathBreadcrumb}>{currentPath}</Text>
        </Pressable>

        {loading ? (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" />
            <Text style={styles.loadingText}>Loading files...</Text>
          </View>
        ) : contents.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Ionicons name="folder-open-outline" size={42} color="#9ca3af" />

            <Text style={styles.emptyTitle}>No files found</Text>

            <Text style={styles.emptySubtitle}>This directory is empty.</Text>
          </View>
        ) : (
          <View>
            {contents.map((item, index) => (
              <React.Fragment key={`${item.sha}-${item.path}`}>
                <TouchableOpacity
                  style={styles.fileRow}
                  activeOpacity={0.7}
                  onPress={() => onItemPress(item)}
                >
                  <Ionicons
                    name={
                      item.type === 'dir' ? 'folder' : 'document-text-outline'
                    }
                    size={20}
                    color={item.type === 'dir' ? '#60a5fa' : '#94a3b8'}
                  />

                  <View style={styles.fileRowContent}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  {item.type === 'dir' && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#9ca3af"
                    />
                  )}
                </TouchableOpacity>

                {index < contents.length - 1 && (
                  <View style={styles.separator} />
                )}
              </React.Fragment>
            ))}
          </View>
        )}
      </View>
    );
  },
);

FilesTab.displayName = 'FilesTab';

/* -------------------------------------------------------------------------- */
/* README Tab                                                                 */
/* -------------------------------------------------------------------------- */

interface ReadmeTabProps {
  readme: string;
  loading: boolean;
}

const ReadmeTab = memo(({ readme, loading }: ReadmeTabProps) => {
  if (loading) {
    return (
      <View style={styles.readmeLoader}>
        <ActivityIndicator size="small" />

        <Text style={styles.loadingText}>Loading README...</Text>
      </View>
    );
  }

  return (
    <View style={styles.readmeContainer}>
      <Markdown
        style={markdownStyles}
        rules={{
          image: (node: any, children: any, parent: any, styles: any) => {
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
        {readme || '*No README found.*'}
      </Markdown>
    </View>
  );
});

ReadmeTab.displayName = 'ReadmeTab';

/* -------------------------------------------------------------------------- */
/* Details                                                                    */
/* -------------------------------------------------------------------------- */

export default function Details() {
  const route = useRoute<DetailsRouteProp>();
  const navigation = useNavigation<any>();

  const { owner, repo } = route.params;

  /* ------------------------------------------------------------------------ */
  /* Main state                                                               */
  /* ------------------------------------------------------------------------ */

  const [activeTab, setActiveTab] = useState<TabType>('Files');

  const [meta, setMeta] = useState<RepoMeta | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);

  const [currentBranch, setCurrentBranch] = useState('');

  const [contents, setContents] = useState<RepoContentItem[]>([]);

  const [pathStack, setPathStack] = useState<string[]>(['']);

  const [readme, setReadme] = useState('');

  const [isStarred, setIsStarred] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Independent loading states                                              */
  /* ------------------------------------------------------------------------ */

  const [initialLoading, setInitialLoading] = useState(true);

  const [filesLoading, setFilesLoading] = useState(false);

  const [readmeLoading, setReadmeLoading] = useState(false);

  const [starLoading, setStarLoading] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Toast                                                                    */
  /* ------------------------------------------------------------------------ */

  const [toastVisible, setToastVisible] = useState(false);

  const [toastMessage, setToastMessage] = useState('');

  /* ------------------------------------------------------------------------ */
  /* Refs                                                                     */
  /* ------------------------------------------------------------------------ */

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const requestIdRef = useRef(0);

  const readmeBranchRef = useRef('');

  const snapPoints = useMemo(() => ['50%', '90%'], []);

  /* ------------------------------------------------------------------------ */
  /* Markdown                                                                 */
  /* ------------------------------------------------------------------------ */

  const processedReadme = useMemo(() => preprocessMarkdown(readme), [readme]);

  /* ------------------------------------------------------------------------ */
  /* Toast helper                                                             */
  /* ------------------------------------------------------------------------ */

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Fetch files for branch                                                   */
  /* ------------------------------------------------------------------------ */

  const fetchBranchContents = useCallback(
    async (branch: string, path = '') => {
      if (!branch) {
        return;
      }

      const requestId = ++requestIdRef.current;

      setFilesLoading(true);

      try {
        const endpoint = path
          ? `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(
              branch,
            )}`
          : `/repos/${owner}/${repo}/contents?ref=${encodeURIComponent(
              branch,
            )}`;

        const response = await api.get<RepoContentItem[]>(endpoint);

        /*
         * Ignore stale responses.
         *
         * Example:
         * main request starts
         * develop request starts
         * main finishes after develop
         *
         * Main must NOT overwrite develop.
         */
        if (requestId !== requestIdRef.current) {
          return;
        }

        setContents(sortContents(Array.isArray(response) ? response : []));
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.warn('fetchBranchContents error:', error);

        setContents([]);
        showToast('Unable to load repository files');
      } finally {
        if (requestId === requestIdRef.current) {
          setFilesLoading(false);
        }
      }
    },
    [owner, repo, showToast],
  );

  /* ------------------------------------------------------------------------ */
  /* Fetch README                                                             */
  /* ------------------------------------------------------------------------ */

  const fetchReadme = useCallback(
    async (branch: string) => {
      if (!branch) {
        return;
      }

      /*
       * Avoid fetching the exact same README repeatedly.
       */
      if (readmeBranchRef.current === branch && readme) {
        return;
      }

      setReadmeLoading(true);

      try {
        const response = await api.get(
          `/repos/${owner}/${repo}/readme?ref=${encodeURIComponent(branch)}`,
        );

        const content = response?.content;

        if (content) {
          const decoded = Buffer.from(content, 'base64').toString('utf-8');

          setReadme(decoded);
        } else {
          setReadme('*No README found.*');
        }

        readmeBranchRef.current = branch;
      } catch (error) {
        console.warn('fetchReadme error:', error);

        setReadme('*No README found.*');
        readmeBranchRef.current = branch;
      } finally {
        setReadmeLoading(false);
      }
    },
    [owner, repo, readme],
  );

  /* ------------------------------------------------------------------------ */
  /* Fetch initial repository data                                            */
  /* ------------------------------------------------------------------------ */

  const fetchInitialRepository = useCallback(async () => {
    setInitialLoading(true);

    try {
      const [metaResponse, branchesResponse] = await Promise.all([
        api.get<RepoMeta>(`/repos/${owner}/${repo}`),

        api.get<Branch[]>(`/repos/${owner}/${repo}/branches`).catch(() => []),
      ]);

      setMeta(metaResponse);

      const availableBranches = Array.isArray(branchesResponse)
        ? branchesResponse
        : [];

      setBranches(availableBranches);

      const defaultBranch =
        metaResponse?.default_branch || availableBranches[0]?.name || 'main';

      setCurrentBranch(defaultBranch);
      setPathStack(['']);

      /*
       * Star status should not block repository rendering.
       */
      api
        .get(`/user/starred/${owner}/${repo}`, {
          skipAuth: false,
          requireRawResponse: true,
        })
        .then(() => {
          setIsStarred(true);
        })
        .catch((error: any) => {
          if (error?.status === 404) {
            setIsStarred(false);
          }
        });

      /*
       * Files are the first visible tab, so load them immediately.
       *
       * README is intentionally lazy-loaded when its tab is opened.
       */
      await fetchBranchContents(defaultBranch, '');
    } catch (error) {
      console.warn('fetchInitialRepository error:', error);

      showToast('Unable to load repository details');
    } finally {
      setInitialLoading(false);
    }
  }, [owner, repo, fetchBranchContents, showToast]);

  /* ------------------------------------------------------------------------ */
  /* Initial request                                                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    fetchInitialRepository();

    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchInitialRepository]);

  /* ------------------------------------------------------------------------ */
  /* Tab switching                                                            */
  /* ------------------------------------------------------------------------ */

  const handleTabChange = useCallback(
    (tab: TabType) => {
      /*
       * IMPORTANT:
       *
       * We change the tab FIRST.
       * There is no await here.
       * No API call blocks this operation.
       */
      setActiveTab(tab);

      /*
       * README is lazy-loaded only when requested.
       *
       * This keeps Files -> README transition immediate
       * even for large repositories.
       */
      if (tab === 'README' && currentBranch) {
        fetchReadme(currentBranch);
      }
    },
    [currentBranch, fetchReadme],
  );

  /* ------------------------------------------------------------------------ */
  /* Branch bottom sheet                                                      */
  /* ------------------------------------------------------------------------ */

  const openBranchSheet = useCallback(() => {
    if (branches.length === 0) {
      showToast('No branches available');
      return;
    }

    /*
     * Do NOT perform any async work before present().
     */
    requestAnimationFrame(() => {
      bottomSheetRef.current?.present();
    });
  }, [branches.length, showToast]);

  const handleBranchSelect = useCallback(
    (branch: string) => {
      if (branch === currentBranch) {
        bottomSheetRef.current?.dismiss();
        return;
      }

      /*
       * UI changes immediately.
       */
      setCurrentBranch(branch);
      setPathStack(['']);

      /*
       * Close sheet immediately.
       */
      bottomSheetRef.current?.dismiss();

      /*
       * Clear old files so the user doesn't think
       * they belong to the new branch.
       */
      setContents([]);

      /*
       * If user is currently on README, load the README
       * for the new branch.
       *
       * Otherwise only fetch files.
       */
      if (activeTab === 'README') {
        fetchReadme(branch);
      }

      fetchBranchContents(branch, '');
    },
    [currentBranch, activeTab, fetchBranchContents, fetchReadme],
  );

  /* ------------------------------------------------------------------------ */
  /* Directory navigation                                                     */
  /* ------------------------------------------------------------------------ */

  const handleItemPress = useCallback(
    (item: RepoContentItem) => {
      if (item.type === 'dir') {
        const newPath = item.path;

        setPathStack(previous => [...previous, newPath]);

        fetchBranchContents(currentBranch, newPath);

        return;
      }

      navigation.navigate('CodeViewer', {
        owner,
        repo,
        path: item.path,
        sha: item.sha,
        branch: currentBranch,
      });
    },
    [currentBranch, fetchBranchContents, navigation, owner, repo],
  );

  const handleBackInTree = useCallback(() => {
    setPathStack(previous => {
      if (previous.length <= 1) {
        return previous;
      }

      const newStack = [...previous];
      newStack.pop();

      const previousPath = newStack[newStack.length - 1];

      fetchBranchContents(currentBranch, previousPath);

      return newStack;
    });
  }, [currentBranch, fetchBranchContents]);

  const handleRootPress = useCallback(() => {
    if (pathStack.length <= 1) {
      return;
    }

    setPathStack(['']);

    fetchBranchContents(currentBranch, '');
  }, [currentBranch, fetchBranchContents, pathStack.length]);

  /* ------------------------------------------------------------------------ */
  /* Star                                                                     */
  /* ------------------------------------------------------------------------ */

  const toggleStar = useCallback(async () => {
    if (starLoading) {
      return;
    }

    const previousValue = isStarred;

    setIsStarred(!previousValue);
    setStarLoading(true);

    try {
      if (previousValue) {
        await api.delete(`/user/starred/${owner}/${repo}`, {
          requireRawResponse: true,
        });
      } else {
        await api.put(`/user/starred/${owner}/${repo}`, undefined, {
          requireRawResponse: true,
        });
      }
    } catch (error) {
      setIsStarred(previousValue);

      showToast(
        previousValue ? 'Unable to remove star' : 'Unable to star repository',
      );
    } finally {
      setStarLoading(false);
    }
  }, [isStarred, starLoading, owner, repo, showToast]);

  /* ------------------------------------------------------------------------ */
  /* Share                                                                    */
  /* ------------------------------------------------------------------------ */

  const shareRepo = useCallback(async () => {
    if (!meta) {
      return;
    }

    try {
      await Share.share({
        message: `Check out ${owner}/${repo} on GitHub: ${meta.html_url}`,
        url: meta.html_url,
      });
    } catch (error: any) {
      console.warn('Share error:', error?.message);
    }
  }, [meta, owner, repo]);

  /* ------------------------------------------------------------------------ */
  /* Header                                                                   */
  /* ------------------------------------------------------------------------ */

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text numberOfLines={1} ellipsizeMode="tail" style={styles.headerTitle}>
        {owner}/{repo}
      </Text>

      <TouchableOpacity style={styles.iconBtn} onPress={shareRepo}>
        <Ionicons name="share-social-outline" size={22} color="#000" />
      </TouchableOpacity>
    </View>
  );

  /* ------------------------------------------------------------------------ */
  /* Meta                                                                     */
  /* ------------------------------------------------------------------------ */

  const renderMeta = () => {
    if (initialLoading && !meta) {
      return (
        <View style={styles.metaLoading}>
          <ActivityIndicator size="small" />

          <Text style={styles.loadingText}>Loading repository...</Text>
        </View>
      );
    }

    if (!meta) {
      return null;
    }

    return (
      <View style={styles.metaContainer}>
        <View style={styles.metaHeaderRow}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="logo-github" size={32} color="#111827" />
          </View>

          <Text style={styles.description}>
            {meta.description || 'No repository description available.'}
          </Text>
        </View>

        {meta.topics?.length > 0 && (
          <View style={styles.topicsRow}>
            {meta.topics.slice(0, 5).map(topic => (
              <View key={topic} style={styles.topicBadge}>
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[styles.statBadge, isStarred && styles.statBadgeStarred]}
            onPress={toggleStar}
            disabled={starLoading}
          >
            {starLoading ? (
              <ActivityIndicator size="small" style={styles.starLoader} />
            ) : (
              <Ionicons
                name={isStarred ? 'star' : 'star-outline'}
                size={16}
                color={isStarred ? '#b45309' : '#666'}
              />
            )}

            <Text
              style={[styles.statText, isStarred && styles.statTextStarred]}
            >
              {isStarred ? 'Starred' : 'Star'}
            </Text>
          </TouchableOpacity>

          <View style={styles.statBadge}>
            <Ionicons name="git-network-outline" size={16} color="#666" />

            <Text style={styles.statText}>
              {meta.forks_count >= 1000
                ? `${(meta.forks_count / 1000).toFixed(1)}k`
                : meta.forks_count}
            </Text>
          </View>

          <View style={styles.statBadge}>
            <Ionicons name="star-outline" size={16} color="#666" />

            <Text style={styles.statText}>
              {meta.stargazers_count >= 1000
                ? `${(meta.stargazers_count / 1000).toFixed(1)}k`
                : meta.stargazers_count}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Branch Sheet                                                             */
  /* ------------------------------------------------------------------------ */

  const renderBranchSheet = () => (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDismissOnClose
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetIndicator}
      backdropComponent={props => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      )}
    >
      <BottomSheetView style={styles.sheetContainer}>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>Switch Branch</Text>

            <Text style={styles.sheetSubtitle}>
              Select a branch to view its files
            </Text>
          </View>

          <TouchableOpacity
            style={styles.sheetCloseBtn}
            onPress={() => bottomSheetRef.current?.dismiss()}
          >
            <Ionicons name="close" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={branches}
          keyExtractor={item => item.name}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.branchList}
          renderItem={({ item }) => {
            const isActive = currentBranch === item.name;

            return (
              <TouchableOpacity
                style={[styles.sheetRow, isActive && styles.sheetRowActive]}
                activeOpacity={0.7}
                onPress={() => handleBranchSelect(item.name)}
              >
                <View style={styles.branchNameContainer}>
                  <Ionicons
                    name="git-branch-outline"
                    size={18}
                    color={isActive ? '#111827' : '#6b7280'}
                  />

                  <Text
                    style={[
                      styles.sheetRowText,
                      isActive && styles.sheetRowTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </View>

                {isActive && (
                  <Ionicons name="checkmark-circle" size={21} color="#111827" />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Text style={styles.emptyTitle}>No branches available</Text>
            </View>
          }
        />
      </BottomSheetView>
    </BottomSheetModal>
  );

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <BottomSheetModalProvider>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={styles.container} edges={['top']}>
        {renderHeader()}

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={[1]}
        >
          {/* Index 0 */}
          {renderMeta()}

          {/* Index 1 */}
          <Tabs activeTab={activeTab} onChange={handleTabChange} />

          {/* Index 2 */}
          <View style={styles.contentArea}>
            /* * IMPORTANT: * * Only the active tab is mounted. * * The old
            implementation rendered BOTH Files * and README and then used
            display:none. * * That is especially expensive when README is large.
            */
            {activeTab === 'Files' ? (
              <FilesTab
                branches={branches}
                currentBranch={currentBranch}
                contents={contents}
                pathStack={pathStack}
                loading={
                  filesLoading || (initialLoading && contents.length === 0)
                }
                onBranchPress={openBranchSheet}
                onItemPress={handleItemPress}
                onBack={handleBackInTree}
                onRootPress={handleRootPress}
              />
            ) : (
              <ReadmeTab readme={processedReadme} loading={readmeLoading} />
            )}
          </View>
        </ScrollView>

        {/* Branch Bottom Sheet */}
        {renderBranchSheet()}

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

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },

  pressed: {
    opacity: 0.65,
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
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
    flex: 1,
    marginHorizontal: 12,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  scrollView: {
    flex: 1,
  },

  /* ---------------------------------------------------------------------- */
  /* Meta                                                                    */
  /* ---------------------------------------------------------------------- */

  metaContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },

  metaLoading: {
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#e5e7eb',
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
    marginBottom: 14,
  },

  topicBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginRight: 7,
    marginBottom: 7,
  },

  topicText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 11,
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
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  statTextStarred: {
    color: '#92400e',
  },

  starLoader: {
    width: 16,
    height: 16,
  },

  /* ---------------------------------------------------------------------- */
  /* Tabs                                                                    */
  /* ---------------------------------------------------------------------- */

  stickyTabsWrapper: {
    backgroundColor: '#fafafa',
    paddingTop: 8,
    paddingBottom: 8,
  },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#d5d6d7',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 4,
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },

  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },

  tabTextActive: {
    color: '#111827',
  },

  /* ---------------------------------------------------------------------- */
  /* Content                                                                 */
  /* ---------------------------------------------------------------------- */

  contentArea: {
    minHeight: 400,
  },

  filesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  branchRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },

  branchSelector: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },

  branchText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#4b5563',
    marginHorizontal: 6,
    fontSize: 14,
    fontWeight: '600',
  },

  backTreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  backTreeText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },

  pathBreadcrumb: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 12,
    color: '#111827',
  },

  inlineLoader: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },

  fileRow: {
    minHeight: 52,
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

  /* ---------------------------------------------------------------------- */
  /* README                                                                  */
  /* ---------------------------------------------------------------------- */

  readmeContainer: {
    padding: 16,
    backgroundColor: '#fff',
    minHeight: 400,
  },

  readmeLoader: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  /* ---------------------------------------------------------------------- */
  /* Empty                                                                   */
  /* ---------------------------------------------------------------------- */

  emptyCenter: {
    minHeight: 180,
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },

  emptySubtitle: {
    marginTop: 5,
    fontSize: 13,
    color: '#9ca3af',
  },

  /* ---------------------------------------------------------------------- */
  /* Bottom Sheet                                                            */
  /* ---------------------------------------------------------------------- */

  sheetBackground: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  sheetIndicator: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },

  sheetContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 16,
  },

  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  sheetSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },

  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  branchList: {
    paddingBottom: 30,
  },

  sheetRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },

  sheetRowActive: {
    backgroundColor: '#f3f4f6',
  },

  branchNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  sheetRowText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },

  sheetRowTextActive: {
    fontWeight: '700',
    color: '#111827',
  },
});
