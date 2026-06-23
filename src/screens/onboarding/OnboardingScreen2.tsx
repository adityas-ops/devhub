import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { OnboardingStackParamList } from '../../routes/types';

type NavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'Onboarding2'
>;

// Contribution levels: 0 (empty), 1-4 (shades of green)
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
      return '#d1fae5'; // Level 1 (Lightest Green)
    case 2:
      return '#a7f3d0'; // Level 2
    case 3:
      return '#34d399'; // Level 3
    case 4:
      return '#10b981'; // Level 4 (Darkest Green)
    default:
      return '#f1f5f9'; // Level 0 (Empty Slate)
  }
};

export default function OnboardingScreen2() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <LinearGradient
      colors={['#f2faf5', '#faf9f6', '#fdf6eb']}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.graphicContainer}>
            <View style={styles.svgShadowWrapper}>
              <Svg viewBox="0 0 240 150" width={240} height={150}>
                {/* Card Background */}
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
                
                {/* Header indicators */}
                <Rect x="18" y="20" width="60" height="10" rx="5" fill="#34d399" />
                <Rect x="18" y="38" width="100" height="7" rx="3.5" fill="#e2e8f0" />
                
                {/* Contribution Grid */}
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
          </View>

          <Text style={styles.title}>
            Watch your streak{'\n'}light up in green.
          </Text>
          <Text style={styles.subtitle}>
            A hand-built contribution graph, swipeable notifications, and code
            you can actually read on a phone.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.dotsContainer}>
            <View style={styles.dotInactive} />
            <View style={styles.dotActive} />
            <View style={styles.dotInactive} />
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
              onPress={() => navigation.navigate('Onboarding3')}
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
  graphicContainer: {
    width: 240,
    marginBottom: 40,
  },
  svgShadowWrapper: {
    backgroundColor: 'transparent',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 4,
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

