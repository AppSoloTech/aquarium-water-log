import { forwardRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  helperText?: string;
  errorText?: string;
  size?: 'sm' | 'md';
  leftAdornment?: ReactNode;
  rightAdornment?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

/**
 * Single labeled-input primitive used across forms. Manages its own focus
 * ring (border swap on focus). Multiline mode applies a textarea-like
 * minHeight and top-aligned text. The label doubles as the
 * `accessibilityLabel` when one isn't provided explicitly.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    helperText,
    errorText,
    size = 'md',
    leftAdornment,
    rightAdornment,
    containerStyle,
    inputStyle,
    multiline,
    accessibilityLabel,
    accessibilityHint,
    ...inputProps
  },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const hasError = Boolean(errorText);
  const borderColor = hasError
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.border;
  const helper = errorText || helperText;
  const helperColor = hasError ? theme.colors.danger : theme.colors.textMuted;

  const padY = size === 'sm' ? theme.spacing.sm : theme.spacing.md;
  const padX = theme.spacing.md;
  const minHeight = multiline ? 96 : size === 'sm' ? 40 : 48;

  return (
    <View style={[styles.container, { gap: theme.spacing.xs }, containerStyle]}>
      {label ? (
        <Text style={[theme.typography.label, { color: theme.colors.text }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.fieldRow,
          {
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radius.md,
            borderWidth: focused || hasError ? 2 : 1,
            minHeight,
            paddingHorizontal: padX,
            // Compensate so total height is stable across focused/unfocused.
            paddingVertical: padY - (focused || hasError ? 1 : 0),
            gap: theme.spacing.sm,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}>
        {leftAdornment}
        <TextInput
          ref={ref}
          {...inputProps}
          multiline={multiline}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint ?? helperText}
          style={[
            styles.input,
            theme.typography.bodyMd,
            {
              color: theme.colors.text,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            inputStyle,
          ]}
        />
        {rightAdornment}
      </View>
      {helper ? (
        <Text style={[theme.typography.caption, { color: helperColor }]}>{helper}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  fieldRow: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    padding: 0,
  },
});
