import { StyleSheet, Text, View } from 'react-native';

import { getStatusColor, type ReadingStatus } from '@/lib/water-status';

type StatusBadgeProps = {
  status: ReadingStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = getStatusColor(status);

  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}14` }]}>
      <Text style={[styles.text, { color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  text: {
    fontSize: 13,
    fontWeight: '800',
  },
});
