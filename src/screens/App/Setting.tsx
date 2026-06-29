import React, { useState } from 'react';
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
import { useAppSelector } from '../../store';
import { useGitHubAuth } from '../../auth/useGitHubAuth';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6/static';
// import { useAppSelector } from '../../../store';
// import { useGitHubAuth } from '../../../auth/useGitHubAuth';

export default function Setting() {
  const user = useAppSelector(state => state.auth.user);
  const { logout } = useGitHubAuth();

  const [prReviews, setPrReviews] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [releases, setReleases] = useState(true);

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
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <View>
              <Text style={styles.rowText}>Clear cache</Text>
              <Text style={styles.subText}>Frees up 2.4 MB</Text>
            </View>
            <FontAwesome6 name="trash-can" size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {/* DEVELOPER SECTION */}
        <Text style={styles.sectionHeader}>DEVELOPER</Text>
        <View style={styles.card}>
          <View style={styles.apiLimitRow}>
            <Text style={styles.subText}>API rate limit</Text>
            <Text style={styles.apiLimitText}>4,823 / 5,000</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarFill} />
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
          onPress={logout}
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
    borderColor: '#f1f1f1',
    // Slight shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
