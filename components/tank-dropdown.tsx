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
                <Pressable
                  style={[styles.option, selectedTankId === null ? styles.selectedOption : null]}
                  onPress={() => chooseTank(null)}>
                  <Text
                    style={[styles.optionText, selectedTankId === null ? styles.selectedOptionText : null]}>
                    {allOptionLabel}
                  </Text>
                  {selectedTankId === null ? <Text style={styles.selectedText}>Selected</Text> : null}
                </Pressable>
              ) : null}

              {tanks.map((tank) => (
                <Pressable
                  key={tank.id}
                  style={[styles.option, selectedTankId === tank.id ? styles.selectedOption : null]}
                  onPress={() => chooseTank(tank.id)}>
                  <Text
                    style={[styles.optionText, selectedTankId === tank.id ? styles.selectedOptionText : null]}>
                    {tank.name}
                  </Text>
                  {selectedTankId === tank.id ? <Text style={styles.selectedText}>Selected</Text> : null}
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
    alignItems: 'center',
    borderBottomColor: AquariumTheme.borderSoft,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  selectedOption: {
    backgroundColor: AquariumTheme.surfaceMint,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  optionText: {
    color: AquariumTheme.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedOptionText: {
    color: AquariumTheme.teal,
    fontWeight: '800',
  },
  selectedText: {
    color: AquariumTheme.teal,
    fontSize: 12,
    fontWeight: '800',
  },
});
