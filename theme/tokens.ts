/**
 * Design tokens. Pure values, no React, no Platform branches.
 *
 * Colors are keyed by role rather than shade so screens describe intent
 * ("primary", "danger") rather than appearance ("blue", "red") and so the
 * dark scheme can swap values without touching call sites.
 */

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceAccent: string;
  surfaceWarning: string;
  border: string;
  borderStrong: string;
  borderAccent: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primaryContent: string;
  accent: string;
  accentContent: string;
  warning: string;
  warningContent: string;
  danger: string;
  dangerContent: string;
  success: string;
  successContent: string;
  overlay: string;
  shadow: string;
};

const lightColors: ColorTokens = {
  background: '#F4FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF5F9',
  surfaceAccent: '#E6F7F2',
  surfaceWarning: '#FFF4E5',
  border: '#D7E7EE',
  borderStrong: '#B5D3DE',
  borderAccent: '#7BD4BE',
  text: '#0B1F33',
  textMuted: '#5A7180',
  textInverse: '#FFFFFF',
  primary: '#0284C7',
  primaryPressed: '#0369A1',
  primaryContent: '#FFFFFF',
  accent: '#0F766E',
  accentContent: '#FFFFFF',
  warning: '#B45309',
  warningContent: '#FFFFFF',
  danger: '#B42318',
  dangerContent: '#FFFFFF',
  success: '#047857',
  successContent: '#FFFFFF',
  overlay: 'rgba(7,89,133,0.45)',
  shadow: '#0B4A6F',
};

const darkColors: ColorTokens = {
  background: '#07111A',
  surface: '#0F1B26',
  surfaceMuted: '#0B1924',
  surfaceAccent: '#0E2A26',
  surfaceWarning: '#2A1E10',
  border: '#1F3243',
  borderStrong: '#2E465B',
  borderAccent: '#115E59',
  text: '#E8F2F7',
  textMuted: '#91A5B3',
  textInverse: '#07111A',
  primary: '#38BDF8',
  primaryPressed: '#7DD3FC',
  primaryContent: '#07111A',
  accent: '#2DD4BF',
  accentContent: '#07111A',
  warning: '#F59E0B',
  warningContent: '#07111A',
  danger: '#F87171',
  dangerContent: '#07111A',
  success: '#34D399',
  successContent: '#07111A',
  overlay: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
};

export const colors = {
  light: lightColors,
  dark: darkColors,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xl2: 24,
  xl3: 32,
  xl4: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/**
 * Typography is keyed by role and bakes the Inter weight into `fontFamily`.
 * Avoid `fontWeight` strings on Android with custom TTFs — they're unreliable
 * and often render as 400 regardless.
 */
const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  displayLg: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  displayMd: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.2 },
  titleLg: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.1 },
  titleMd: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: 0 },
  titleSm: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: 0.1 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyMd: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0.1 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, letterSpacing: 0.2 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
} as const;

export const shadows = {
  card: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  cardElevated: {
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const motion = {
  duration: { fast: 120, base: 180, slow: 260 },
  easing: {
    standard: [0.2, 0, 0, 1] as const,
    emphasized: [0.3, 0, 0, 1] as const,
  },
} as const;

export const fontFamilies = fonts;
