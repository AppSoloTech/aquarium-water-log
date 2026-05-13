import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Top-level error boundary so an unhandled render error shows a recovery
 * screen instead of a white crash. Class component because React Native still
 * requires `componentDidCatch` lifecycle for catching child errors.
 *
 * The fallback intentionally does NOT depend on `useTheme()` — if theme
 * loading itself was the source of the error, we still need to render
 * something. The light palette is hardcoded here for that reason.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.iconBubble}>
          <Text style={styles.iconGlyph}>!</Text>
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.description}>
          {this.state.error.message || 'The app hit an unexpected error.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reload the app"
          onPress={this.handleReset}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonLabel}>Reload</Text>
        </Pressable>
      </View>
    );
  }
}

const palette = colors.light;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: palette.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl2,
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: palette.surfaceWarning,
    borderRadius: radius.pill,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  iconGlyph: {
    ...typography.displayMd,
    color: palette.warning,
  },
  title: {
    ...typography.titleLg,
    color: palette.text,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyMd,
    color: palette.textMuted,
    textAlign: 'center',
  },
  button: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonPressed: {
    backgroundColor: palette.primaryPressed,
  },
  buttonLabel: {
    ...typography.titleSm,
    color: palette.primaryContent,
  },
});
