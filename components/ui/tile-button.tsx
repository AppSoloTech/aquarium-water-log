import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

import { IconSymbol, type IconSymbolName } from './icon-symbol';

type TileButtonProps = {
  title: string;
  description?: string;
  icon: IconSymbolName;
  onPress: () => void;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Used six times in the Settings tile grid. Card-like surface with icon +
 * title + description, animated press-scale, light haptic on press, full
 * a11y baked in.
 */
export function TileButton({
  title,
  description,
  icon,
  onPress,
  accessibilityHint,
  style,
}: TileButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  return (
    <Animated.View style={[styles.wrap, animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={accessibilityHint ?? description}
        onPress={handlePress}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 120 });
        }}
        style={({ pressed }) => [
          styles.tile,
          {
            backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
            gap: theme.spacing.sm,
          },
          theme.shadows.card,
        ]}>
        <View style={[styles.iconBubble, { backgroundColor: theme.colors.surfaceAccent }]}>
          <IconSymbol name={icon} size={22} color={theme.colors.accent} />
        </View>
        <Text style={[theme.typography.titleMd, { color: theme.colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text
            style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}
            numberOfLines={3}>
            {description}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  tile: { borderWidth: 1, flex: 1, minHeight: 132 },
  iconBubble: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
});
