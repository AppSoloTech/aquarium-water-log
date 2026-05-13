import { useMemo } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { colors, motion, radius, shadows, spacing, typography } from './tokens';

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof colors.light;
export type Theme = {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
  motion: typeof motion;
};

/**
 * Returns the active theme tokens. Memoized by scheme so the returned object
 * has stable referential equality across renders — required for
 * `reactCompiler: true` (see app.json) to skip work correctly.
 */
export function useTheme(): Theme {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return useMemo<Theme>(
    () => ({
      scheme,
      colors: colors[scheme],
      spacing,
      radius,
      typography,
      shadows,
      motion,
    }),
    [scheme],
  );
}

/**
 * Helper for `StyleSheet.create`-style declarations that need theme tokens.
 * The factory is called with the active theme and memoized per scheme.
 *
 *   const styles = useThemedStyles((t) => StyleSheet.create({
 *     container: { backgroundColor: t.colors.background, padding: t.spacing.lg },
 *   }));
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
