import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './button';
import { IconSymbol, type IconSymbolName } from './icon-symbol';

type Tone = 'neutral' | 'info' | 'warning';

type EmptyStateProps = {
  icon: IconSymbolName;
  title: string;
  description?: string;
  tone?: Tone;
  action?: {
    label: string;
    onPress: () => void;
  };
};

/**
 * Replaces the bare `<Text>No tests yet...</Text>` patterns scattered across
 * screens. Circular icon bubble + title + optional description + optional
 * CTA, all centered.
 */
export function EmptyState({ icon, title, description, tone = 'neutral', action }: EmptyStateProps) {
  const theme = useTheme();
  const palette = tonePalette(tone, theme);

  return (
    <View style={[styles.container, { gap: theme.spacing.md, padding: theme.spacing.lg }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: palette.bubble,
            borderRadius: theme.radius.pill,
          },
        ]}>
        <IconSymbol name={icon} size={28} color={palette.icon} />
      </View>
      <Text
        style={[theme.typography.titleMd, styles.center, { color: theme.colors.text }]}
        accessibilityRole="header">
        {title}
      </Text>
      {description ? (
        <Text style={[theme.typography.bodyMd, styles.center, { color: theme.colors.textMuted }]}>
          {description}
        </Text>
      ) : null}
      {action ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Button label={action.label} onPress={action.onPress} size="md" />
        </View>
      ) : null}
    </View>
  );
}

function tonePalette(tone: Tone, theme: ReturnType<typeof useTheme>) {
  if (tone === 'warning') {
    return { bubble: theme.colors.surfaceWarning, icon: theme.colors.warning };
  }
  if (tone === 'info') {
    return { bubble: theme.colors.surfaceAccent, icon: theme.colors.accent };
  }
  return { bubble: theme.colors.surfaceMuted, icon: theme.colors.textMuted };
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  bubble: { alignItems: 'center', height: 64, justifyContent: 'center', width: 64 },
  center: { textAlign: 'center' },
});
