import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui';
import type { Tank } from '@/lib/database';
import { useTheme } from '@/theme';

type TankDropdownProps = {
  label: string;
  tanks: Tank[];
  selectedTankId: number | null;
  onSelect: (tankId: number | null) => void;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  emptyLabel?: string;
};

export function TankDropdown({
  label,
  tanks,
  selectedTankId,
  onSelect,
  includeAllOption = false,
  allOptionLabel = 'All Tanks',
  emptyLabel = 'Choose a tank',
}: TankDropdownProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selectedTank = tanks.find((tank) => tank.id === selectedTankId);
  const selectedLabel = selectedTankId === null && includeAllOption ? allOptionLabel : selectedTank?.name;

  function chooseTank(tankId: number | null) {
    onSelect(tankId);
    setOpen(false);
  }

  return (
    <View style={[styles.field, { gap: theme.spacing.xs }]}>
      <Text style={[theme.typography.label, { color: theme.colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selectedLabel ?? emptyLabel }}
        accessibilityHint="Opens a list of tanks"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
          },
        ]}>
        <Text
          style={[
            theme.typography.bodyMd,
            styles.buttonText,
            { color: selectedLabel ? theme.colors.text : theme.colors.textMuted },
          ]}
          numberOfLines={1}>
          {selectedLabel ?? emptyLabel}
        </Text>
        <IconSymbol name="chevron.down" size={20} color={theme.colors.primary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityLabel="Close picker"
          style={[
            styles.backdrop,
            {
              backgroundColor: theme.colors.overlay,
              paddingTop: insets.top + theme.spacing.lg,
            },
          ]}
          onPress={() => setOpen(false)}>
          <Pressable
            accessibilityLabel={`${label} options`}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface,
                borderBottomLeftRadius: theme.radius.xl,
                borderBottomRightRadius: theme.radius.xl,
                paddingTop: theme.spacing.lg,
                paddingHorizontal: theme.spacing.lg,
                paddingBottom: theme.spacing.xl,
              },
              theme.shadows.cardElevated,
            ]}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
            <Text
              style={[theme.typography.titleLg, { color: theme.colors.text, marginBottom: theme.spacing.sm }]}
              accessibilityRole="header">
              {label}
            </Text>
            <ScrollView style={styles.optionList}>
              {includeAllOption ? (
                <DropdownOption
                  label={allOptionLabel}
                  selected={selectedTankId === null}
                  onPress={() => chooseTank(null)}
                />
              ) : null}
              {tanks.map((tank) => (
                <DropdownOption
                  key={tank.id}
                  label={tank.name}
                  selected={selectedTankId === tank.id}
                  onPress={() => chooseTank(tank.id)}
                />
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DropdownOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected
            ? theme.colors.surfaceAccent
            : pressed
              ? theme.colors.surfaceMuted
              : 'transparent',
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
        },
      ]}>
      <Text
        style={[
          theme.typography.bodyLg,
          { color: selected ? theme.colors.accent : theme.colors.text, flex: 1 },
        ]}>
        {label}
      </Text>
      {selected ? <IconSymbol name="checkmark" size={20} color={theme.colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {},
  button: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  buttonText: { flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  sheet: {
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 36,
  },
  optionList: { maxHeight: 420 },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginVertical: 2,
  },
});
