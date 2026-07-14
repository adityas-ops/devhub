import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const SKELETON_COLOR = '#E5E7EB';
const HIGHLIGHT_COLOR = '#F3F4F6';

/**
 * Animated skeleton card that matches the search result card layout.
 * Pulses between two gray tones to indicate loading.
 */
export default function SkeletonCard() {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const backgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SKELETON_COLOR, HIGHLIGHT_COLOR],
  });

  return (
    <View style={styles.card}>
      {/* Icon placeholder */}
      <Animated.View style={[styles.iconPlaceholder, { backgroundColor }]} />

      {/* Text placeholders */}
      <View style={styles.textContainer}>
        <Animated.View style={[styles.titlePlaceholder, { backgroundColor }]} />
        <Animated.View
          style={[styles.subtitlePlaceholder, { backgroundColor }]}
        />
      </View>

      {/* Badge placeholder */}
      <Animated.View style={[styles.badgePlaceholder, { backgroundColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titlePlaceholder: {
    width: '70%',
    height: 14,
    borderRadius: 6,
    marginBottom: 8,
  },
  subtitlePlaceholder: {
    width: '50%',
    height: 12,
    borderRadius: 6,
  },
  badgePlaceholder: {
    width: 44,
    height: 24,
    borderRadius: 12,
    marginLeft: 12,
  },
});
