import React, { useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export const SkeletonBone = ({
  width,
  height,
  borderRadius = 4,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) => {
  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#d1d5db',
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

export const SkeletonRepoCard = () => {
  return (
    <View style={styles.repoCard}>
      <View style={styles.repoHeaderRow}>
        <SkeletonBone
          width={32}
          height={32}
          borderRadius={8}
          style={{ marginRight: 12 }}
        />
        <View style={styles.repoTitleContainer}>
          <SkeletonBone width="70%" height={16} />
        </View>
        <SkeletonBone width={20} height={20} borderRadius={10} />
      </View>
      <SkeletonBone width="100%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonBone width="80%" height={14} style={{ marginBottom: 16 }} />
      <View style={styles.repoMetaRow}>
        <SkeletonBone width={60} height={14} />
        <SkeletonBone width={45} height={14} />
        <SkeletonBone width={45} height={14} />
      </View>
    </View>
  );
};

export const SkeletonActivityRow = () => {
  return (
    <View style={styles.activityRow}>
      <SkeletonBone
        width={36}
        height={36}
        borderRadius={18}
        style={{ marginRight: 12 }}
      />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <SkeletonBone width="85%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonBone width="40%" height={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  repoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8e8e5',
  },
  repoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  repoTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
  },
  repoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  activityRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginHorizontal: 24,
  },
});
