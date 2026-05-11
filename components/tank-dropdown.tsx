import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { AquariumTheme } from '@/constants/aquarium-theme';
import type { Tank } from '@/lib/database';

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
  const [open, setOpen] = useState(false);
  const selectedTank = tanks.find((tank) => tank.id === selectedTankId);
  const selectedLabel = selectedTankId === null && includeAllOption ? allOptionLabel : selectedTank?.name;

  function chooseTank(tankId: number | null) {
    onSelect(tankId);
    setOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.button} onPress={() => setOpen(true)}>
        <Text style={[styles.buttonText, !selectedLabel ? styles.placeholderText : null]}>
          {selectedLabel ?? emptyLabel}
        </Text>
        <Text style={styles.chevron}>v</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView style={styles.optionList}>
              {includeAllOption ? (
                <Pressable style={styles.option} onPress={() => chooseTank(null)}>
                  <Text style={styles.optionText}>{allOptionLabel}</Text>
                </Pressable>
              ) : null}

              {tanks.map((tank) => (
                <Pressable key={tank.id} style={styles.option} onPress={() => chooseTank(tank.id)}>
                  <Text style={styles.optionText}>{tank.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    color: AquariumTheme.text,
    fontSize: 15,
    fontWeight: '800',
  },
  button: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  buttonText: {
    color: AquariumTheme.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  placeholderText: {
    color: AquariumTheme.muted,
    fontWeight: '400',
  },
  chevron: {
    color: AquariumTheme.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  backdrop: {
    backgroundColor: 'rgba(7, 89, 133, 0.38)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AquariumTheme.surface,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxHeight: '70%',
    padding: 18,
  },
  sheetTitle: {
    color: AquariumTheme.primaryDark,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  optionList: {
    maxHeight: 420,
  },
  option: {
    borderBottomColor: AquariumTheme.borderSoft,
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  optionText: {
    color: AquariumTheme.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
