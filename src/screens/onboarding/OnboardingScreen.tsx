import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import FontAwesome6 from '@react-native-vector-icons/fontawesome6';
import { useAppDispatch } from '../../store';
import { completeOnboarding } from '../../store/slices/authSlice';

const { width, height } = Dimensions.get('window');

// --- Screen 1: Wavy Border Component ---
const WavyBorder = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 18000,
        easing: Easing.linear,
      }),
      -1,
      false
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

// --- Screen 2: Grid Data & Colors ---
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

export default function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (activeIndex < 2) {
      scrollViewRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
      setActiveIndex(activeIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (activeIndex > 0) {
      scrollViewRef.current?.scrollTo({ x: (activeIndex - 1) * width, animated: true });
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    dispatch(completeOnboarding());
  };

  // --- Background Interpolation Style ---
  const bg1Style = useAnimatedStyle(() => {
    const opacity = interpolate(scrollX.value, [0, width], [1, 0], 'clamp');
    return { opacity };
  });

  const bg2Style = useAnimatedStyle(() => {
    const opacity = interpolate(scrollX.value, [0, width, width * 2], [0, 1, 0], 'clamp');
    return { opacity };
  });

  const bg3Style = useAnimatedStyle(() => {
    const opacity = interpolate(scrollX.value, [width, width * 2], [0, 1], 'clamp');
    return { opacity };
  });

  // --- Animated Styles for Graphics ---
  const makeGraphicStyle = (index: number) => {
    return useAnimatedStyle(() => {
      const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
      const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], 'clamp');
      const scale = interpolate(scrollX.value, inputRange, [0.8, 1, 0.8], 'clamp');
      const translateY = interpolate(scrollX.value, inputRange, [30, 0, -30], 'clamp');
      return {
        opacity,
        transform: [{ scale }, { translateY }],
      };
    });
  };

  // --- Animated Styles for Text ---
  const makeTextStyle = (index: number) => {
    return useAnimatedStyle(() => {
      const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
      const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], 'clamp');
      const translateX = interpolate(scrollX.value, inputRange, [60, 0, -60], 'clamp');
      return {
        opacity,
        transform: [{ translateX }],
      };
    });
  };

  // --- Dot Styling Animations ---
  const makeDotStyle = (index: number) => {
    return useAnimatedStyle(() => {
      const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
      const dotWidth = interpolate(scrollX.value, inputRange, [6, 24, 6], 'clamp');
      return {
        width: dotWidth,
      };
    });
  };

  return (
    <View style={styles.container}>
      {/* Background Gradients */}
      <Animated.View style={[StyleSheet.absoluteFill, bg1Style]}>
        <LinearGradient
          colors={['#f3f0ff', '#faf9f6', '#f3f7f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, bg2Style]}>
        <LinearGradient
          colors={['#f2faf5', '#faf9f6', '#fdf6eb']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, bg3Style]}>
        <LinearGradient
          colors={['#fdf2f8', '#faf9f6', '#f5f3ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={styles.scrollView}
        >
          {/* Slide 1 */}
          <View style={styles.slide}>
            <View style={styles.slideContent}>
              <Animated.View style={[styles.graphicContainer, makeGraphicStyle(0)]}>
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
              </Animated.View>

              <Animated.View style={makeTextStyle(0)}>
                <Text style={styles.title}>
                  Your repos.{'\n'}One pocket-sized hub.
                </Text>
                <Text style={styles.subtitle}>
                  Track stars, scan diffs, and ship reviews{'\n'}without ever opening
                  a laptop.
                </Text>
              </Animated.View>
            </View>
          </View>

          {/* Slide 2 */}
          <View style={styles.slide}>
            <View style={styles.slideContent}>
              <Animated.View style={[styles.graphicContainer, makeGraphicStyle(1)]}>
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
                    {gridPattern.map((row, rowIndex) =>
                      row.map((level, colIndex) => {
                        const cellSize = 10;
                        const gap = 4;
                        const x = 18 + colIndex * (cellSize + gap);
                        const y = 60 + rowIndex * (cellSize + gap);
                        return (
                          <Rect
                            key={`${rowIndex}-${colIndex}`}
                            x={x}
                            y={y}
                            width={cellSize}
                            height={cellSize}
                            rx={2.5}
                            fill={getCellColor(level)}
                          />
                        );
                      })
                    )}
                  </Svg>
                </View>
              </Animated.View>

              <Animated.View style={makeTextStyle(1)}>
                <Text style={styles.title}>
                  Watch your streak{'\n'}light up in green.
                </Text>
                <Text style={styles.subtitle}>
                  A hand-built contribution graph, swipeable notifications, and code
                  you can actually read on a phone.
                </Text>
              </Animated.View>
            </View>
          </View>

          {/* Slide 3 */}
          <View style={styles.slide}>
            <View style={styles.slideContent}>
              <Animated.View style={[styles.graphicContainer, makeGraphicStyle(2)]}>
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
              </Animated.View>

              <Animated.View style={makeTextStyle(2)}>
                <Text style={styles.title}>
                  Built for the way{'\n'}you already work.
                </Text>
                <Text style={styles.subtitle}>
                  Sign in once with GitHub. Everything else — secure, synced, and fast.
                </Text>
              </Animated.View>
            </View>
          </View>
        </Animated.ScrollView>

        <View style={styles.footer}>
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, makeDotStyle(0), activeIndex === 0 ? styles.dotActive : styles.dotInactive]} />
            <Animated.View style={[styles.dot, makeDotStyle(1), activeIndex === 1 ? styles.dotActive : styles.dotInactive]} />
            <Animated.View style={[styles.dot, makeDotStyle(2), activeIndex === 2 ? styles.dotActive : styles.dotInactive]} />
          </View>

          <View style={styles.buttonsRow}>
            {activeIndex === 0 ? (
              <TouchableOpacity style={styles.buttonSkip} onPress={handleSkip}>
                <Text style={styles.buttonSkipText}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.buttonBack} onPress={handleBack}>
                <Text style={styles.buttonBackText}>‹</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.buttonNext} onPress={handleNext}>
              <Text style={styles.buttonNextText}>
                {activeIndex === 2 ? 'Get started' : 'Next'}
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
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 40,
  },
  // Slide 1 Graphic Specifics
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
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  // Slide 2 Graphic Specifics
  svgShadowWrapper: {
    backgroundColor: 'transparent',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
  },
  // Slide 3 Graphic Specifics
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
  branchCard: {
    backgroundColor: '#FDF4FF',
    borderColor: '#E879F9',
  },
  bellCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    transform: [{ translateY: 10 }],
  },
  // Typography
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
  // Footer Elements
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
  dotActive: {
    backgroundColor: '#0f172a',
  },
  dotInactive: {
    backgroundColor: '#cbd5e1',
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
  buttonSkipText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
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
