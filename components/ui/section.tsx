import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

type SectionProps = {
  title?: string;
  subtitle?: string;
  trailing?: ReactNode;
  children?: ReactNode;
};

/**
 * Header row (title + optional subtitle + optional trailing slot) followed by
 * a column of `children` with consistent gap. Replaces the
 * `<Text style={styles.sectionTitle}>` + ad-hoc `<View>` patterns.
 */
export function Section({ title, subtitle, trailing, children }: SectionProps) {
  const theme = useTheme();
  const showHeader = Boolean(title || subtitle || trailing);

  return (
    <View style={[styles.container, { gap: theme.spacing.sm }]}>
      {showHeader ? (
        <View style={[styles.header, { gap: theme.spacing.md }]}>
          <View style={styles.headerText}>
            {title ? (
              <Text style={[theme.typography.titleLg, { color: theme.colors.text }]}>{title}</Text>
            ) : null}
            {subtitle ? (
              <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {trailing ? <View>{trailing}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerText: { flexShrink: 1, gap: 2 },
});
