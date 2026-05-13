import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme, type ColorTokens } from '@/theme';

type CardVariant = 'standard' | 'accent' | 'warning' | 'muted' | 'primary';
type CardElevation = 'none' | 'sm' | 'md';
type CardPadding = 'sm' | 'md' | 'lg';

type CardProps = {
  variant?: CardVariant;
  elevation?: CardElevation;
  padding?: CardPadding;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Generic container with theme-aware variant + elevation. Replaces ~7 inline
 * panel/card styles spread across the app. Always uses `radius.lg`.
 *
 * `variant`:
 *  - standard: surface + border (default content card)
 *  - accent:   surfaceAccent + borderAccent (highlighted sections)
 *  - warning:  surfaceWarning + warning-tinted border (cautions, alerts)
 *  - muted:    surfaceMuted + no border (subdued container)
 *  - primary:  primary background, used for hero panels
 */
export function Card({
  variant = 'standard',
  elevation = 'sm',
  padding = 'md',
  children,
  style,
}: CardProps) {
  const theme = useTheme();
  const { background, border } = variantColors(variant, theme.colors);

  const paddingValue = {
    sm: theme.spacing.md,
    md: theme.spacing.lg,
    lg: theme.spacing.xl,
  }[padding];

  const elevationStyle =
    elevation === 'none' ? undefined : elevation === 'md' ? theme.shadows.cardElevated : theme.shadows.card;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: background,
          borderColor: border ?? 'transparent',
          borderWidth: border ? StyleSheet.hairlineWidth * 2 : 0,
          borderRadius: theme.radius.lg,
          padding: paddingValue,
          gap: theme.spacing.md,
        },
        elevationStyle,
        style,
      ]}>
      {children}
    </View>
  );
}

function variantColors(variant: CardVariant, c: ColorTokens) {
  switch (variant) {
    case 'accent':
      return { background: c.surfaceAccent, border: c.borderAccent };
    case 'warning':
      return { background: c.surfaceWarning, border: c.warning };
    case 'muted':
      return { background: c.surfaceMuted, border: null as string | null };
    case 'primary':
      return { background: c.primary, border: null as string | null };
    case 'standard':
    default:
      return { background: c.surface, border: c.border };
  }
}

const styles = StyleSheet.create({
  base: {},
});
