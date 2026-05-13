import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme';

type QuickValueRowProps = {
  values: number[];
  onSelect: (value: string) => void;
  fieldLabel?: string;
};

/**
 * Row of tappable "quick value" chips that fill the adjacent numeric input.
 * Each chip announces itself as a button to assistive tech with a context
 * label ("Set NO3 nitrate to 20") so a screen-reader user understands the
 * relationship between the chip and the input above it.
 */
export function QuickValueRow({ values, onSelect, fieldLabel }: QuickValueRowProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { gap: theme.spacing.sm }]}>
      {values.map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={fieldLabel ? `Set ${fieldLabel} to ${value}` : `Use ${value}`}
          onPress={() => onSelect(String(value))}
          hitSlop={4}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: pressed ? theme.colors.surfaceAccent : theme.colors.surfaceMuted,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: 6,
            },
          ]}>
          <Text style={[theme.typography.caption, { color: theme.colors.text }]}>{value}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { alignItems: 'center', borderWidth: 1, minWidth: 44 },
});
