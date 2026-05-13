import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, type ColorTokens } from '@/theme';

import { IconSymbol, type IconSymbolName } from './icon-symbol';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
type Haptic = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'none';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  leftIcon?: IconSymbolName;
  rightIcon?: IconSymbolName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: Haptic;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Single source of truth for buttons across the app. Built-in:
 *  - variants (primary / secondary / ghost / danger) and three sizes
 *  - reanimated press-scale (1 → 0.97 over 120 ms)
 *  - haptic feedback on press, configurable per call site
 *  - loading + disabled states
 *  - `accessibilityRole="button"` + `accessibilityState={{ disabled, busy }}`
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = 'light',
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isDisabled = disabled || loading;
  const palette = variantPalette(variant, theme.colors);
  const sizing = sizeMetrics(size, theme.spacing);

  const handlePressIn = () => {
    if (isDisabled) return;
    scale.value = withTiming(0.97, { duration: 120 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  const handlePress = () => {
    if (isDisabled) return;
    if (haptic !== 'none' && Platform.OS !== 'web') {
      triggerHaptic(haptic);
    }
    onPress();
  };

  const content: ReactNode = loading ? (
    <ActivityIndicator color={palette.foreground} />
  ) : (
    <View style={[styles.row, { gap: theme.spacing.sm }]}>
      {leftIcon ? <IconSymbol name={leftIcon} size={sizing.iconSize} color={palette.foreground} /> : null}
      <Text
        style={[
          variant === 'ghost' ? theme.typography.titleSm : theme.typography.titleSm,
          { color: palette.foreground, fontSize: sizing.fontSize },
        ]}
        numberOfLines={1}>
        {label}
      </Text>
      {rightIcon ? <IconSymbol name={rightIcon} size={sizing.iconSize} color={palette.foreground} /> : null}
    </View>
  );

  return (
    <Animated.View style={[animatedStyle, fullWidth ? styles.fullWidth : styles.shrink, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        testID={testID}
        hitSlop={size === 'sm' ? 6 : 0}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed ? palette.backgroundPressed : palette.background,
            borderColor: palette.border ?? undefined,
            borderRadius: theme.radius.md,
            borderWidth: palette.border ? 1 : 0,
            opacity: isDisabled ? 0.5 : 1,
            paddingHorizontal: sizing.padX,
            paddingVertical: sizing.padY,
            minHeight: sizing.minHeight,
          },
        ]}>
        {content}
      </Pressable>
    </Animated.View>
  );
}

function triggerHaptic(kind: Haptic) {
  try {
    switch (kind) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Haptics is best-effort; failures should never block the user action.
  }
}

function variantPalette(variant: Variant, c: ColorTokens) {
  switch (variant) {
    case 'secondary':
      return {
        background: c.surface,
        backgroundPressed: c.surfaceMuted,
        foreground: c.primary,
        border: c.borderStrong,
      };
    case 'ghost':
      return {
        background: 'transparent',
        backgroundPressed: c.surfaceMuted,
        foreground: c.primary,
        border: null as string | null,
      };
    case 'danger':
      return {
        background: c.danger,
        backgroundPressed: '#8F1A12',
        foreground: c.dangerContent,
        border: null as string | null,
      };
    case 'primary':
    default:
      return {
        background: c.primary,
        backgroundPressed: c.primaryPressed,
        foreground: c.primaryContent,
        border: null as string | null,
      };
  }
}

function sizeMetrics(size: Size, spacing: ReturnType<typeof useTheme>['spacing']) {
  switch (size) {
    case 'sm':
      return { padX: spacing.md, padY: spacing.sm, fontSize: 14, iconSize: 16, minHeight: 36 };
    case 'lg':
      return { padX: spacing.xl, padY: spacing.lg, fontSize: 17, iconSize: 22, minHeight: 56 };
    case 'md':
    default:
      return { padX: spacing.lg, padY: spacing.md, fontSize: 15, iconSize: 20, minHeight: 48 };
  }
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  row: { alignItems: 'center', flexDirection: 'row' },
  fullWidth: { alignSelf: 'stretch' },
  shrink: { alignSelf: 'flex-start' },
});
