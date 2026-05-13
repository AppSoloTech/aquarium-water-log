import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  size?: 'sm' | 'md';
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Selectable pill, used for the analyte filter row in History and the
 * quick-value row in Add Test. Mirrors `accessibilityState.selected` so
 * TalkBack announces "selected" / "not selected".
 */
export function Chip({ label, selected = false, onPress, size = 'md', accessibilityLabel, style }: ChipProps) {
  const theme = useTheme();
  const padX = size === 'sm' ? theme.spacing.md : theme.spacing.lg;
  const padY = size === 'sm' ? 6 : theme.spacing.sm;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : pressed
              ? theme.colors.surfaceMuted
              : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.pill,
          paddingHorizontal: padX,
          paddingVertical: padY,
        },
        style,
      ]}>
      <Text
        style={[
          theme.typography.titleSm,
          { color: selected ? theme.colors.primaryContent : theme.colors.text },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
});
