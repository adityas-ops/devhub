import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
  Image,
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
import { useNavigation } from '@react-navigation/native';
// import { useAppSelector } from '../../../store';
// import { useGitHubAuth } from '../../../auth/useGitHubAuth';

export default function Setting() {
  const user = useAppSelector(state => state.auth.user);
  const { logout: authLogout } = useGitHubAuth();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const [prReviews, setPrReviews] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [releases, setReleases] = useState(true);

  // Rate Limit State
  const [rateLimit, setRateLimit] = useState<{
    limit: number;
    remaining: number;
  } | null>(null);

  // Cache Size State
  const [cacheSize, setCacheSize] = useState('0 MB');

  // Toast State
  const [toastVisible, setToastVisible] = useState(false);

  // 1. Fetch Rate Limit
  useEffect(() => {
    const fetchRateLimit = async () => {
      try {
        const res = await api.get<any>('/rate_limit');
        if (res?.resources?.core) {
          setRateLimit(res.resources.core);
        }
      } catch (err) {
        console.warn('Failed to fetch rate limit:', err);
      }
    };
    fetchRateLimit();
  }, []);

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
        <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
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
        </View>

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
          <View style={styles.apiLimitRow}>
            <Text style={styles.subText}>API rate limit</Text>
            <Text style={styles.apiLimitText}>
              {rateLimit
                ? `${rateLimit.remaining} / ${rateLimit.limit}`
                : 'Loading...'}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: rateLimit
                    ? `${(rateLimit.remaining / rateLimit.limit) * 100}%`
                    : '0%',
                },
              ]}
            />
          </View>
        </View>

        {/* ABOUT SECTION */}
        <Text style={styles.sectionHeader}>ABOUT</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.borderBottom]}>
            <Text style={styles.rowText}>Version</Text>
            <Text style={styles.versionText}>2.4.1</Text>
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
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '96%', // 4823/5000 is approx 96%
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
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
});
