import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/error-boundary';
import { configureNotificationHandler } from '@/lib/reminders';
import { fontFamilies, useTheme } from '@/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Block the splash from auto-hiding until the font assets resolve so we don't
// flash the system font on cold start.
SplashScreen.preventAutoHideAsync().catch(() => {
  // No-op: only fails when splash has already been hidden (e.g. fast refresh).
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    // Configure once at startup so foreground notifications behave correctly
    // even before the user visits Settings. The function itself is idempotent.
    configureNotificationHandler().catch((error) => {
      console.warn('Notification handler init failed', error);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemedNavigation />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

function ThemedNavigation() {
  const theme = useTheme();
  const navTheme = useMemo<NavigationTheme>(() => {
    const base = theme.scheme === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        border: theme.colors.border,
        text: theme.colors.text,
        primary: theme.colors.primary,
        notification: theme.colors.primary,
      },
      fonts: {
        ...base.fonts,
        regular: { ...base.fonts.regular, fontFamily: fontFamilies.regular },
        medium: { ...base.fonts.medium, fontFamily: fontFamilies.medium },
        bold: { ...base.fonts.bold, fontFamily: fontFamilies.bold },
        heavy: { ...base.fonts.heavy, fontFamily: fontFamilies.bold },
      },
    };
  }, [theme]);

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontFamily: fontFamilies.semibold },
          contentStyle: { backgroundColor: theme.colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="edit-test" options={{ title: 'Edit Test' }} />
      </Stack>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
