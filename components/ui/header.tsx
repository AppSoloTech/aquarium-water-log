import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { IconSymbol } from './icon-symbol';

type HeaderProps = {
  title: string;
  onBack?: () => void;
  trailing?: ReactNode;
};

/**
 * Inline page header for in-tab subsections (e.g. Settings → Reminders).
 * Owns the safe-area top inset so the underlying `<Screen>` can pass
 * `edges={[]}` and avoid double-padding.
 */
export function Header({ title, onBack, trailing }: HeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.md,
        },
      ]}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: pressed ? theme.colors.surfaceMuted : 'transparent',
              borderRadius: theme.radius.md,
            },
          ]}>
          <IconSymbol name="arrow.left" size={22} color={theme.colors.text} />
        </Pressable>
      ) : null}
      <Text
        style={[theme.typography.titleLg, styles.title, { color: theme.colors.text }]}
        numberOfLines={1}
        accessibilityRole="header">
        {title}
      </Text>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  backButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  title: { flex: 1 },
});
