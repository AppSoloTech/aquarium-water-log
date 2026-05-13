import { StyleSheet, Text, View } from 'react-native';

import { useTheme, type ColorTokens } from '@/theme';
import type { ReadingStatus } from '@/lib/water-status';

type StatusPillProps = {
  status: ReadingStatus;
  size?: 'sm' | 'md';
};

/**
 * Theme-aware status indicator. Replaces components/status-badge.tsx and
 * stops importing the hardcoded hexes from lib/water-status.ts so the UI
 * layer owns color decisions.
 */
export function StatusPill({ status, size = 'md' }: StatusPillProps) {
  const theme = useTheme();
  const color = statusColor(status, theme.colors);
  const padY = size === 'sm' ? 2 : 4;
  const padX = size === 'sm' ? theme.spacing.sm : theme.spacing.md;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: tinted(color, theme.scheme === 'dark' ? 0.18 : 0.12),
          borderColor: color,
          borderRadius: theme.radius.pill,
          paddingHorizontal: padX,
          paddingVertical: padY,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status ${status}`}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[theme.typography.caption, { color }]}>{status}</Text>
    </View>
  );
}

function statusColor(status: ReadingStatus, c: ColorTokens) {
  if (status === 'Danger') return c.danger;
  if (status === 'Caution') return c.warning;
  return c.success;
}

// Append an alpha to a 6-char hex. Falls back to the source color if `color`
// isn't a plain hex (e.g. our dark-mode warning yellow is still hex; tokens
// avoid rgba() for solid colors).
function tinted(color: string, alpha: number) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${a}`;
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
  },
  dot: { borderRadius: 999, height: 8, width: 8 },
});
