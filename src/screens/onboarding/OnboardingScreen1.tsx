import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, Mask, Rect } from 'react-native-svg';
import { useAppDispatch } from '../../store';
import { completeOnboarding } from '../../store/slices/authSlice';
import { OnboardingStackParamList } from '../../routes/types';

type NavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'Onboarding1'
>;

import FontAwesome6 from '@react-native-vector-icons/fontawesome6';

const WavyBorder = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 18000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.rotatingWrapper, animatedStyle]}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Rect
          x={0.75}
          y={0.75}
          width={118.5}
          height={118.5}
          rx={38}
          stroke="rgba(124, 58, 237, 0.35)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
};

export default function OnboardingScreen1() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();

  const handleSkip = () => {
    dispatch(completeOnboarding());
  };

  return (
    <LinearGradient
      colors={['#f3f0ff', '#faf9f6', '#f3f7f6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.logoOuterContainer}>
            <WavyBorder />
            <LinearGradient
              colors={['#7C3AED', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCard}
            >
              <FontAwesome6
                name="github"
                size={48}
                color="#ffffff"
                iconStyle="brand"
              />
            </LinearGradient>
          </View>

          <Text style={styles.title}>
            Your repos.{'\n'}One pocket-sized hub.
          </Text>
          <Text style={styles.subtitle}>
            Track stars, scan diffs, and ship reviews{'\n'}without ever opening
            a laptop.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.dotsContainer}>
            <View style={styles.dotActive} />
            <View style={styles.dotInactive} />
            <View style={styles.dotInactive} />
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.buttonSkip} onPress={handleSkip}>
              <Text style={styles.buttonSkipText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonNext}
              onPress={() => navigation.navigate('Onboarding2')}
            >
              <Text style={styles.buttonNextText}>Next</Text>
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
  logoOuterContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  rotatingWrapper: {
    position: 'absolute',
    width: 190,
    height: 190,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCard: {
    width: 108,
    height: 108,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
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
  buttonSkip: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSkipText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonNext: {
    flex: 1.2,
    marginLeft: 10,
    backgroundColor: '#0f172a',
    paddingVertical: 16,
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
