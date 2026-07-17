import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Share,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppStackParamList } from '../../routes/types';
import api from '../../utils/api';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Markdown from 'react-native-markdown-display';
import { Buffer } from 'buffer';

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

  const bottomSheetRef = useRef<BottomSheet>(null);

  const fetchRepoData = useCallback(async (branch?: string) => {
    setLoading(true);
    try {
      const metaRes = await api.get<RepoMeta>(`/repos/${owner}/${repo}`);
      setMeta(metaRes);
      
      const targetBranch = branch || metaRes.default_branch;
      if (!currentBranch) {
        setCurrentBranch(targetBranch);
      }

      try {
        await api.get(`/user/starred/${owner}/${repo}`, { skipAuth: false, requireRawResponse: true });
        setIsStarred(true);
      } catch (err: any) {
        if (err.status === 404) setIsStarred(false);
      }

      const [readmeRes, contentsRes, branchesRes] = await Promise.all([
        api.get(`/repos/${owner}/${repo}/readme?ref=${targetBranch}`).catch(() => null),
        api.get<RepoContentItem[]>(`/repos/${owner}/${repo}/contents?ref=${targetBranch}`).catch(() => []),
        api.get<Branch[]>(`/repos/${owner}/${repo}/branches`).catch(() => [])
      ]);

      if (readmeRes && readmeRes.content) {
        const decoded = Buffer.from(readmeRes.content, 'base64').toString('utf-8');
        setReadme(decoded);
      } else {
        setReadme('*No README found.*');
      }

      const sortedContents = (Array.isArray(contentsRes) ? contentsRes : []).sort((a, b) => {
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
  }, [owner, repo, currentBranch]);

  useEffect(() => {
    fetchRepoData();
  }, [fetchRepoData]);

  const fetchContentsForPath = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const res = await api.get<RepoContentItem[]>(`/repos/${owner}/${repo}/contents/${path}?ref=${currentBranch}`);
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
  }, [owner, repo, currentBranch]);

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
        branch: currentBranch
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
        await api.delete(`/user/starred/${owner}/${repo}`, { requireRawResponse: true });
      } else {
        await api.put(`/user/starred/${owner}/${repo}`, undefined, { requireRawResponse: true });
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

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{owner}/{repo}</Text>
      <TouchableOpacity style={styles.iconBtn} onPress={shareRepo}>
        <Ionicons name="share-social-outline" size={22} color="#000" />
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {(['Files', 'README', 'Commits'] as TabType[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {tab === 'Files' && <Ionicons name="document-outline" size={14} />} {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const currentPathDisplay = pathStack[pathStack.length - 1] === '' ? 'root' : pathStack[pathStack.length - 1];

  const renderFiles = () => (
    <View style={styles.filesContainer}>
      <View style={styles.branchRow}>
        <TouchableOpacity style={styles.branchSelector} onPress={() => bottomSheetRef.current?.expand()}>
          <Text style={styles.branchText}>{currentBranch}</Text>
          <Ionicons name="chevron-down" size={14} color="#666" />
        </TouchableOpacity>
        
        {pathStack.length > 1 && (
          <TouchableOpacity style={styles.backTreeBtn} onPress={handleBackInTree}>
            <Ionicons name="arrow-undo-outline" size={16} color="#666" />
            <Text style={styles.backTreeText}> Back</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.pathBreadcrumb}>{currentPathDisplay}</Text>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={contents}
          keyExtractor={(item) => item.sha + item.path}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.fileRow} onPress={() => handleItemPress(item)}>
              <Ionicons 
                name={item.type === 'dir' ? 'folder' : 'document'} 
                size={20} 
                color={item.type === 'dir' ? '#60a5fa' : '#94a3b8'} 
              />
              <View style={styles.fileRowContent}>
                <Text style={styles.fileName}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      {/* Meta Info */}
      {meta && (
        <View style={styles.metaContainer}>
          <View style={styles.metaHeaderRow}>
             <View style={styles.avatarPlaceholder}>
                <Ionicons name="logo-react" size={32} color="#8b5cf6" />
             </View>
             <Text style={styles.description}>{meta.description}</Text>
          </View>
          
          <View style={styles.topicsRow}>
            {meta.topics?.slice(0, 3).map(t => (
              <View key={t} style={styles.topicBadge}><Text style={styles.topicText}>{t}</Text></View>
            ))}
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity style={[styles.statBadge, isStarred && styles.statBadgeStarred]} onPress={toggleStar}>
              <Ionicons name={isStarred ? "star" : "star-outline"} size={16} color={isStarred ? "#b45309" : "#666"} />
              <Text style={[styles.statText, isStarred && styles.statTextStarred]}>
                {isStarred ? " Starred" : " Star"}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.statBadge}>
              <Ionicons name="git-network-outline" size={16} color="#666" />
              <Text style={styles.statText}> {meta.forks_count >= 1000 ? (meta.forks_count/1000).toFixed(1)+'k' : meta.forks_count}</Text>
            </View>

            <View style={styles.statBadge}>
              <Ionicons name="star-outline" size={16} color="#666" />
              <Text style={styles.statText}> {meta.stargazers_count >= 1000 ? (meta.stargazers_count/1000).toFixed(1)+'k' : meta.stargazers_count}</Text>
            </View>
          </View>
        </View>
      )}

      {renderTabs()}

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {activeTab === 'Files' && renderFiles()}
        
        {activeTab === 'README' && (
           <FlatList 
             data={['dummy']}
             renderItem={() => (
               <View style={styles.readmeContainer}>
                 <Markdown>{readme}</Markdown>
               </View>
             )}
           />
        )}
        
        {activeTab === 'Commits' && (
          <View style={styles.emptyCenter}>
            <Text>Commits list coming soon...</Text>
          </View>
        )}
      </View>
      
      {/* Branch Picker Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['50%', '90%']}
        enablePanDownToClose
        backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
      >
        <View style={styles.sheetContainer}>
          <Text style={styles.sheetTitle}>Switch Branch</Text>
          <FlatList
            data={branches}
            keyExtractor={item => item.name}
            renderItem={({item}) => (
              <TouchableOpacity 
                style={styles.sheetRow}
                onPress={() => {
                  setCurrentBranch(item.name);
                  setPathStack(['']);
                  bottomSheetRef.current?.close();
                  fetchRepoData(item.name);
                }}
              >
                <Text style={[styles.sheetRowText, currentBranch === item.name && styles.sheetRowActive]}>
                  {item.name}
                </Text>
                {currentBranch === item.name && <Ionicons name="checkmark" size={20} color="#000" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
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
  metaContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
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
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#111827',
  },
  contentArea: {
    flex: 1,
  },
  filesContainer: {
    flex: 1,
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
    flex: 1,
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
