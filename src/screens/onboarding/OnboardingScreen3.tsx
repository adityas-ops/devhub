import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { useAppDispatch } from '../../store';
import { completeOnboarding } from '../../store/slices/authSlice';
import { OnboardingStackParamList } from '../../routes/types';

type NavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'Onboarding3'
>;

export default function OnboardingScreen3() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();

  const handleFinish = () => {
    dispatch(completeOnboarding());
  };

  return (
    <LinearGradient
      colors={['#fdf2f8', '#faf9f6', '#f5f3ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.popContainer}>
            {/* Zoom Card */}
            <View style={[styles.iconCard, styles.zoomCard]}>
              <FontAwesome6
                name="magnifying-glass"
                size={22}
                color="#DB2777"
                iconStyle="solid"
              />
            </View>

            {/* Branch Card */}
            <View style={[styles.iconCard, styles.branchCard]}>
              <FontAwesome6
                name="code-branch"
                size={22}
                color="#A21CAF"
                iconStyle="solid"
              />
            </View>

            {/* Bell Card */}
            <View style={[styles.iconCard, styles.bellCard]}>
              <FontAwesome6
                name="bell"
                size={22}
                color="#EA580C"
                iconStyle="solid"
              />
            </View>
          </View>

          <Text style={styles.title}>
            Built for the way{'\n'}you already work.
          </Text>
          <Text style={styles.subtitle}>
            Sign in once with GitHub. Everything else — secure, synced, and fast.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.dotsContainer}>
            <View style={styles.dotInactive} />
            <View style={styles.dotInactive} />
            <View style={styles.dotActive} />
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.buttonBack}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.buttonBackText}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonNext}
              onPress={handleFinish}
            >
              <Text style={styles.buttonNextText}>Get started</Text>
              <Text style={styles.buttonNextArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  popContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
    height: 70, // to accommodate offset nicely
  },
  iconCard: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomCard: {
    backgroundColor: '#FCE7F3',
    borderColor: '#F9A8D4',
    transform: [{ translateY: 10 }],
  },
  branchCard: {
    backgroundColor: '#FDF4FF',
    borderColor: '#E879F9',
  },
  bellCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    transform: [{ translateY: 10 }],
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 16,
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dotActive: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0f172a',
    marginHorizontal: 3,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 3,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonBack: {
    width: 64,
    height: 56,
    marginRight: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBackText: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 32,
    marginTop: -4,
  },
  buttonNext: {
    flex: 1,
    marginLeft: 10,
    height: 56,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonNextText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
  buttonNextArrow: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 20,
  },
});
