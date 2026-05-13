import { type ReactElement, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  edges?: Edge[];
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ReactElement<RefreshControlProps>;
};

/**
 * Top-level layout for every screen. Owns:
 *  - background color from theme
 *  - safe-area padding (replaces all the `paddingTop: 56/64` hardcodes)
 *  - default scrolling + sane keyboard behavior
 *  - consistent screen padding + section gap
 */
export function Screen({
  children,
  scroll = true,
  keyboardAvoiding = false,
  edges = ['top'],
  contentContainerStyle,
  refreshControl,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const paddingTop = edges.includes('top') ? insets.top + theme.spacing.lg : theme.spacing.lg;
  const paddingBottom = edges.includes('bottom') ? insets.bottom + theme.spacing.lg : theme.spacing.lg;

  const padStyle: ViewStyle = {
    paddingTop,
    paddingBottom,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.lg,
  };

  const containerStyle: ViewStyle = { backgroundColor: theme.colors.background, flex: 1 };

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[padStyle, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      style={styles.flex}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padStyle, contentContainerStyle]}>{children}</View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={containerStyle}>
        {content}
      </KeyboardAvoidingView>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
