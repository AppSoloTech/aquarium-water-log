import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Pulsing placeholder block. Drives opacity 0.4 ↔ 0.8 over 1200 ms via
 * Reanimated so animation runs on the UI thread.
 */
export function Skeleton({ width = '100%', height = 14, radius, style }: SkeletonProps) {
  const theme = useTheme();
  const progress = useSharedValue(0.4);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Animated.View
      style={[
        styles.block,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: radius ?? theme.radius.sm,
          width,
          height,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * Preset for the per-tank reading card on Home while data loads.
 */
export function SkeletonReadingCard() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        },
      ]}>
      <Skeleton width="60%" height={18} />
      <Skeleton width="40%" height={12} />
      <View style={{ height: theme.spacing.xs }} />
      <Skeleton width="100%" height={48} radius={theme.radius.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {},
  card: { borderWidth: 1 },
});
