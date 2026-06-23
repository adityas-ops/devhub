import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useAppDispatch } from '../../store';
import { login } from '../../store/slices/authSlice';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';

export default function LoginScreen() {
  const dispatch = useAppDispatch();

  const handleLogin = () => {
    dispatch(login({ email: 'github-user@devhub.com' }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and App name section */}
        <View style={styles.logoContainer}>
          <View style={styles.iconWrapper}>
            <FontAwesome6
              name="github"
              size={48}
              color="#ffffff"
              iconStyle="brand"
            />
          </View>
          <Text style={styles.title}>DevHub</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Sign in Actions & Info */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <FontAwesome6
              name="github"
              size={20}
              color="#ffffff"
              iconStyle="brand"
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>Sign in with GitHub</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Opens a secure browser session.{'\n'}
            OAuth + PKCE — no password ever touches this app.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    width: '100%',
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
