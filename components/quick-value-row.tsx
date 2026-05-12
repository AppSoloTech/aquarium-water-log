import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AquariumTheme } from '@/constants/aquarium-theme';

type QuickValueRowProps = {
  values: number[];
  onSelect: (value: string) => void;
};

export function QuickValueRow({ values, onSelect }: QuickValueRowProps) {
  return (
    <View style={styles.row}>
      {values.map((value) => (
        <Pressable key={value} style={styles.chip} onPress={() => onSelect(String(value))}>
          <Text style={styles.chipText}>{value}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: AquariumTheme.surfaceMint,
    borderColor: AquariumTheme.borderMint,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: {
    color: AquariumTheme.teal,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
