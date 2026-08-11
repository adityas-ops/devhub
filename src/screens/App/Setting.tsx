import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6/static';
import { useAppSelector, useAppDispatch } from '../../store';
import { useGitHubAuth } from '../../auth/useGitHubAuth';
import api from '../../utils/api';
import { searchApi } from '../../store/searchApi';
import { storage } from '../../storage/mmkvStorage';
import * as Keychain from 'react-native-keychain';
import { logout as logoutAction } from '../../store/slices/authSlice';
import { Toast } from '../../components/home/Toast';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';

export default function Setting() {
  const user = useAppSelector(state => state.auth.user);
  const { logout: authLogout } = useGitHubAuth();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const appVersion = DeviceInfo.getVersion();
  const [prReviews, setPrReviews] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [releases, setReleases] = useState(true);

  // Rate Limit & Usage State
  const [rateLimitData, setRateLimitData] = useState<{
    resources: Record<
      string,
      { limit: number; used: number; remaining: number; reset: number }
    >;
    core: { limit: number; used: number; remaining: number; reset: number };
  } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Cache Size State
  const [cacheSize, setCacheSize] = useState('0 MB');

  // Toast State
  const [toastVisible, setToastVisible] = useState(false);

  // Format epoch seconds reset timestamp
  const formatResetTime = (resetEpoch: number) => {
    if (!resetEpoch) return 'N/A';
    const date = new Date(resetEpoch * 1000);
    const now = new Date();
    const diffMins = Math.round((date.getTime() - now.getTime()) / 60000);
    const timeStr = date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return diffMins > 0 ? `${timeStr} (in ${diffMins}m)` : timeStr;
  };

  // 1. Fetch Complete Rate Limit Breakdown from GET /rate_limit
  const fetchRateLimit = React.useCallback(async () => {
    try {
      const res = await api.get<any>('/rate_limit', {
        requireRawResponse: true,
      });
      const data = res?.data;

      if (data?.resources) {
        const parsedResources: Record<
          string,
          { limit: number; used: number; remaining: number; reset: number }
        > = {};
        Object.keys(data.resources).forEach(key => {
          const item = data.resources[key];
          const limit = item?.limit ?? 0;
          const remaining = item?.remaining ?? 0;
          const used =
            item?.used !== undefined
              ? item.used
              : Math.max(0, limit - remaining);
          const reset = item?.reset ?? 0;
          parsedResources[key] = { limit, used, remaining, reset };
        });

        const core =
          parsedResources.core ||
          (data.rate
            ? {
                limit: data.rate.limit ?? 5000,
                used:
                  data.rate.used ??
                  Math.max(
                    0,
                    (data.rate.limit ?? 5000) - (data.rate.remaining ?? 5000),
                  ),
                remaining: data.rate.remaining ?? 5000,
                reset: data.rate.reset ?? 0,
              }
            : { limit: 5000, used: 0, remaining: 5000, reset: 0 });

        setRateLimitData({ resources: parsedResources, core });
      }
    } catch (err) {
      console.warn('Failed to fetch rate limit:', err);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchRateLimit();
    }, [fetchRateLimit]),
  );

  // 2. Get Storage Size
  const getStorageSize = React.useCallback(() => {
    const keys = storage.getAllKeys();
    let totalBytes = 0;
    keys.forEach(key => {
      const value = storage.getString(key);
      if (value) {
        totalBytes += value.length;
      }
    });
    const sizeMb = (totalBytes / (1024 * 1024)).toFixed(1);
    setCacheSize(`${sizeMb} MB`);
  }, []);

  useEffect(() => {
    getStorageSize();
  }, [getStorageSize]);

  // 3. Clear Cache
  const handleClearCache = () => {
    dispatch(searchApi.util.resetApiState());
    storage.clearAll();
    getStorageSize();
    setToastVisible(true);
  };

  // 4. Handle Logout
  const handleLogout = async () => {
    // await Keychain.resetInternetCredentials('github_auth'); // Or whatever the service name is
    dispatch(logoutAction());
    // Use authLogout to ensure MMKV and other things are fully cleared as originally intended
    await authLogout();
    // Navigation to Auth is usually handled by the root navigator when auth state changes,
    // but we can forcefully navigate if needed (assuming 'Auth' route exists).
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>Settings</Text>

        {/* PROFILE CARD */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.name || user?.login || 'GitHub User'}
              </Text>
              <Text style={styles.profileHandle}>
                @{user?.login || 'username'}
              </Text>
            </View>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>Free</Text>
            </View>
          </View>
        </View>

        {/* NOTIFICATIONS SECTION */}
        {/* <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.borderBottom]}>
            <Text style={styles.rowText}>PR reviews</Text>
            <Switch
              value={prReviews}
              onValueChange={setPrReviews}
              trackColor={{ false: '#e2e8f0', true: '#1e293b' }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={[styles.row, styles.borderBottom]}>
            <Text style={styles.rowText}>Mentions</Text>
            <Switch
              value={mentions}
              onValueChange={setMentions}
              trackColor={{ false: '#e2e8f0', true: '#1e293b' }}
              thumbColor="#ffffff"
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowText}>Releases</Text>
            <Switch
              value={releases}
              onValueChange={setReleases}
              trackColor={{ false: '#e2e8f0', true: '#1e293b' }}
              thumbColor="#ffffff"
            />
          </View>
        </View> */}

        {/* STORAGE SECTION */}
        <Text style={styles.sectionHeader}>STORAGE</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={handleClearCache}
          >
            <View>
              <Text style={styles.rowText}>Clear cache</Text>
              <Text style={styles.subText}>Frees up {cacheSize}</Text>
            </View>
            <FontAwesome6 name="trash-can" size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* DEVELOPER SECTION */}
        <Text style={styles.sectionHeader}>DEVELOPER</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.apiLimitCardButton}
            activeOpacity={0.7}
            onPress={() => setModalVisible(true)}
          >
            <View style={styles.apiLimitHeader}>
              <Text style={styles.rowText}>API Usage & Limits</Text>
              <FontAwesome6
                name="chevron-right"
                size={14}
                color="#64748b"
                iconStyle="solid"
              />
            </View>

            {rateLimitData?.core ? (
              <>
                <View style={styles.apiLimitStatsRow}>
                  <Text style={styles.apiLimitStatText}>
                    Used:{' '}
                    <Text style={styles.boldStatText}>
                      {rateLimitData.core.used}
                    </Text>
                  </Text>
                  <Text style={styles.apiLimitStatText}>
                    Remaining:{' '}
                    <Text style={styles.boldStatText}>
                      {rateLimitData.core.remaining}
                    </Text>{' '}
                    / {rateLimitData.core.limit}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            (rateLimitData.core.used /
                              rateLimitData.core.limit) *
                              100,
                          ),
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </>
            ) : (
              <Text style={styles.subText}>
                Tap to view complete rate limit usage
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ABOUT SECTION */}
        <Text style={styles.sectionHeader}>ABOUT</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.borderBottom]}>
            <Text style={styles.rowText}>Version</Text>
            <Text style={styles.versionText}>{appVersion}</Text>
          </View>
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <Text style={styles.rowText}>Source on GitHub</Text>
            <FontAwesome6
              name="chevron-right"
              size={14}
              color="#0f172a"
              iconStyle="solid"
            />
          </TouchableOpacity>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <FontAwesome6
            name="arrow-right-from-bracket"
            size={16}
            color="#dc2626"
            iconStyle="solid"
          />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* RATE LIMIT BREAKDOWN MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>GitHub API Usage</Text>
                <Text style={styles.modalSubtitle}>
                  Full breakdown by API resource
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome6
                  name="xmark"
                  size={18}
                  color="#64748b"
                  iconStyle="solid"
                />
              </TouchableOpacity>
            </View>

            {/* Modal Scroll Content */}
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {rateLimitData?.resources ? (
                Object.keys(rateLimitData.resources)
                  .sort((a, b) => {
                    if (a === 'core') return -1;
                    if (b === 'core') return 1;
                    if (a === 'search') return -1;
                    if (b === 'search') return 1;
                    return a.localeCompare(b);
                  })
                  .map(resourceName => {
                    const item = rateLimitData.resources[resourceName];
                    const pct =
                      item.limit > 0 ? (item.used / item.limit) * 100 : 0;
                    const formattedName = resourceName
                      .split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');

                    return (
                      <View key={resourceName} style={styles.resourceCard}>
                        <View style={styles.resourceHeader}>
                          <Text style={styles.resourceTitle}>
                            {formattedName}
                          </Text>
                          <Text style={styles.resourceUsedTag}>
                            {item.used} / {item.limit} used
                          </Text>
                        </View>

                        <View style={styles.modalProgressBarContainer}>
                          <View
                            style={[
                              styles.modalProgressBarFill,
                              {
                                width: `${Math.min(100, Math.max(0, pct))}%`,
                                backgroundColor:
                                  pct > 80
                                    ? '#ef4444'
                                    : pct > 50
                                    ? '#f59e0b'
                                    : '#3b82f6',
                              },
                            ]}
                          />
                        </View>

                        <View style={styles.resourceDetailsRow}>
                          <Text style={styles.resourceDetailText}>
                            Remaining:{' '}
                            <Text style={styles.resourceBold}>
                              {item.remaining}
                            </Text>
                          </Text>
                          <Text style={styles.resourceDetailText}>
                            Reset:{' '}
                            <Text style={styles.resourceBold}>
                              {formatResetTime(item.reset)}
                            </Text>
                          </Text>
                        </View>
                      </View>
                    );
                  })
              ) : (
                <Text style={styles.loadingText}>
                  Loading rate limit data...
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {toastVisible && (
        <Toast
          message="Cache cleared successfully"
          type="success"
          onClose={() => setToastVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f5', // Off-white/cream background from the image
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e8e5',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e2e8f0',
  },
  avatarPlaceholder: {
    backgroundColor: '#cbd5e1',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  profileHandle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 2,
  },
  badgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  subText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  apiLimitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  apiLimitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Courier', // Monospace font for numbers
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  apiLimitCardButton: {
    padding: 16,
  },
  apiLimitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  apiLimitStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  apiLimitStatText: {
    fontSize: 13,
    color: '#64748b',
  },
  boldStatText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
    marginLeft: 10,
  },
  bottomPadding: {
    height: 40,
  },
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '84%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  resourceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  resourceUsedTag: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalProgressBarContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  resourceDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resourceDetailText: {
    fontSize: 12,
    color: '#64748b',
  },
  resourceBold: {
    fontWeight: '600',
    color: '#334155',
  },
  loadingText: {
    textAlign: 'center',
    color: '#64748b',
    marginVertical: 24,
    fontSize: 14,
  },
});
