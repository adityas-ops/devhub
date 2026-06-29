import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  ScrollView,
  Animated,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Rect } from 'react-native-svg';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { useAppDispatch } from '../../store';
import { completeOnboarding } from '../../store/slices/authSlice';

const SLIDE_COUNT = 3;

// ---------------------------------------------------------------------------
// Slide 1 — Rotating dashed border
// ---------------------------------------------------------------------------
const WavyBorder = () => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.rotatingWrapper, { transform: [{ rotate: spin }] }]}>
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

// ---------------------------------------------------------------------------
// Slide 2 — Contribution grid
// ---------------------------------------------------------------------------
const gridPattern = [
  [0, 1, 0, 2, 0, 3, 0, 1, 2, 0, 4, 1, 0, 2, 0],
  [1, 0, 2, 0, 3, 0, 4, 0, 1, 2, 0, 0, 3, 0, 1],
  [0, 2, 0, 4, 0, 1, 0, 3, 0, 2, 1, 4, 0, 2, 0],
  [2, 0, 3, 0, 1, 0, 2, 0, 4, 0, 1, 0, 3, 0, 2],
  [0, 1, 0, 2, 0, 3, 0, 1, 0, 4, 0, 2, 0, 1, 3],
];
const getCellColor = (level: number) => {
  switch (level) {
    case 1:
      return '#d1fae5';
    case 2:
      return '#a7f3d0';
    case 3:
      return '#34d399';
    case 4:
      return '#10b981';
    default:
      return '#f1f5f9';
  }
};

// ---------------------------------------------------------------------------
// Slide graphics
// ---------------------------------------------------------------------------
const Slide0Content = () => (
  <View style={styles.logoOuterContainer}>
    <WavyBorder />
    <LinearGradient
      colors={['#7C3AED', '#2563EB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.logoCard}
    >
      <FontAwesome6 name="github" size={48} color="#ffffff" iconStyle="brand" />
    </LinearGradient>
  </View>
);

const Slide1Content = () => (
  <View style={styles.svgShadowWrapper}>
    <Svg viewBox="0 0 240 150" width={240} height={150}>
      <Rect
        x="0"
        y="0"
        width="240"
        height="150"
        rx="24"
        fill="#ffffff"
        stroke="#efede9"
        strokeWidth={1.5}
      />
      <Rect x="18" y="20" width="60" height="10" rx="5" fill="#34d399" />
      <Rect x="18" y="38" width="100" height="7" rx="3.5" fill="#e2e8f0" />
      {gridPattern.map((row, ri) =>
        row.map((level, ci) => (
          <Rect
            key={`${ri}-${ci}`}
            x={18 + ci * 14}
            y={60 + ri * 14}
            width={10}
            height={10}
            rx={2.5}
            fill={getCellColor(level)}
          />
        )),
      )}
    </Svg>
  </View>
);

const Slide2Content = () => (
  <View style={styles.popContainer}>
    <View style={[styles.iconCard, styles.zoomCard]}>
      <FontAwesome6
        name="magnifying-glass"
        size={22}
        color="#DB2777"
        iconStyle="solid"
      />
    </View>
    <View style={[styles.iconCard, styles.branchCard]}>
      <FontAwesome6
        name="code-branch"
        size={22}
        color="#A21CAF"
        iconStyle="solid"
      />
    </View>
    <View style={[styles.iconCard, styles.bellCard]}>
      <FontAwesome6 name="bell" size={22} color="#EA580C" iconStyle="solid" />
    </View>
  </View>
);

const SLIDE_GRAPHICS = [Slide0Content, Slide1Content, Slide2Content];

const TITLES = [
  'Your repos.\nOne pocket-sized hub.',
  'Watch your streak\nlight up in green.',
  'Built for the way\nyou already work.',
];

const SUBTITLES = [
  'Track stars, scan diffs, and ship reviews\nwithout ever opening a laptop.',
  'A hand-built contribution graph, swipeable notifications, and code you can actually read on a phone.',
  'Sign in once with GitHub. Everything else — secure, synced, and fast.',
];

// ---------------------------------------------------------------------------
// Per-slide animated item
// ---------------------------------------------------------------------------
const SlideItem = React.memo(
  ({
    index,
    scrollX,
    width,
  }: {
    index: number;
    scrollX: Animated.Value;
    width: number;
  }) => {
    const Graphic = SLIDE_GRAPHICS[index];
    const center = index * width;
    const range = [center - width, center, center + width];

    const opacity = scrollX.interpolate({
      inputRange: range,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange: range,
      outputRange: [0.85, 1, 0.85],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange: range,
      outputRange: [24, 0, -24],
      extrapolate: 'clamp',
    });

    const translateX = scrollX.interpolate({
      inputRange: range,
      outputRange: [48, 0, -48],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.slideContent}>
          <Animated.View style={[styles.graphicContainer, { opacity, transform: [{ scale }, { translateY }] }]}>
            <Graphic />
          </Animated.View>
          <Animated.View style={{ opacity, transform: [{ translateX }] }}>
            <Text style={styles.title}>{TITLES[index]}</Text>
            <Text style={styles.subtitle}>{SUBTITLES[index]}</Text>
          </Animated.View>
        </View>
      </View>
    );
  },
);

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const dispatch = useAppDispatch();

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex(i);
    },
    [width],
  );

  const scrollToIndex = useCallback(
    (i: number) => {
      const target = Math.max(0, Math.min(SLIDE_COUNT - 1, i));
      scrollViewRef.current?.scrollTo({ x: target * width, animated: true });
      setActiveIndex(target);
    },
    [width],
  );

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDE_COUNT - 1) scrollToIndex(activeIndex + 1);
    else dispatch(completeOnboarding());
  }, [activeIndex, scrollToIndex, dispatch]);

  const handleBack = useCallback(() => {
    if (activeIndex > 0) scrollToIndex(activeIndex - 1);
  }, [activeIndex, scrollToIndex]);

  const handleSkip = useCallback(() => {
    dispatch(completeOnboarding());
  }, [dispatch]);

  // ----- Background gradient opacities -----
  const bg1Opacity = scrollX.interpolate({
    inputRange: [0, width],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  
  const bg2Opacity = scrollX.interpolate({
    inputRange: [0, width, width * 2],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  
  const bg3Opacity = scrollX.interpolate({
    inputRange: [width, width * 2],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // ----- Dot animations -----
  const getDotStyle = (index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];
    
    const dotWidth = scrollX.interpolate({
      inputRange,
      outputRange: [6, 22, 6],
      extrapolate: 'clamp',
    });

    return {
      width: dotWidth,
      backgroundColor: activeIndex === index ? '#0f172a' : '#cbd5e1',
    };
  };

  return (
    <View style={styles.container}>
      {/* Layered background gradients — cross-fade as you swipe */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bg1Opacity }]}>
        <LinearGradient
          colors={['#f3f0ff', '#faf9f6', '#f3f7f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bg2Opacity }]}>
        <LinearGradient
          colors={['#f2faf5', '#faf9f6', '#fdf6eb']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bg3Opacity }]}>
        <LinearGradient
          colors={['#fdf2f8', '#faf9f6', '#f5f3ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false } // false because we animate width and colors
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          bounces={false}
          overScrollMode="never"
          disableIntervalMomentum
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <SlideItem key={i} index={i} scrollX={scrollX} width={width} />
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, getDotStyle(0)]} />
            <Animated.View style={[styles.dot, getDotStyle(1)]} />
            <Animated.View style={[styles.dot, getDotStyle(2)]} />
          </View>

          <View style={styles.buttonsRow}>
            {activeIndex === 0 ? (
              <TouchableOpacity
                style={styles.buttonSkip}
                onPress={handleSkip}
                activeOpacity={0.75}
              >
                <Text style={styles.buttonSkipText}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.buttonBack}
                onPress={handleBack}
                activeOpacity={0.75}
              >
                <Text style={styles.buttonBackText}>‹</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.buttonNext}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonNextText}>
                {activeIndex === SLIDE_COUNT - 1 ? 'Get started' : 'Next'}
              </Text>
              <Text style={styles.buttonNextArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  graphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  // Slide 1
  logoOuterContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
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
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#3b82f6',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
        }
      : { elevation: 8 }),
  },
  // Slide 2
  svgShadowWrapper: {
    backgroundColor: 'transparent',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#64748b',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.08,
          shadowRadius: 32,
        }
      : { elevation: 4 }),
  },
  // Slide 3
  popContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 70,
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
  branchCard: { backgroundColor: '#FDF4FF', borderColor: '#E879F9' },
  bellCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    transform: [{ translateY: 10 }],
  },
  // Text
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
  // Footer
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
  dot: {
    height: 6,
    borderRadius: 3,
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
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSkipText: { color: '#0f172a', fontSize: 16, fontWeight: '600' },
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
    flex: 1.2,
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
