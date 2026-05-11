import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AquariumTheme } from '@/constants/aquarium-theme';
import {
  createTank,
  deleteTank,
  getDefaultTankId,
  getTankSummaries,
  setDefaultTankId,
  type TankSummary,
  updateTank,
} from '@/lib/database';

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'No tests yet';
}

export default function TanksScreen() {
  const router = useRouter();
  const [tanks, setTanks] = useState<TankSummary[]>([]);
  const [defaultTankId, setDefaultTankIdState] = useState<number | null>(null);
  const [tankName, setTankName] = useState('');
  const [notes, setNotes] = useState('');
  const [editingTankId, setEditingTankId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadTanks = useCallback(async () => {
    try {
      setErrorMessage('');
      const [summaries, defaultId] = await Promise.all([getTankSummaries(), getDefaultTankId()]);
      setTanks(summaries);
      setDefaultTankIdState(defaultId);
    } catch (error) {
      console.error(error);
      setErrorMessage('Could not load tanks.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTanks();
    }, [loadTanks]),
  );

  async function addTank() {
    if (!tankName.trim()) {
      Alert.alert('Tank name required', 'Give this tank a name before saving.');
      return;
    }

    try {
      setIsSaving(true);
      const newTankId = await createTank(tankName, notes);
      setTankName('');
      setNotes('');
      await setDefaultTankId(newTankId);
      await loadTanks();
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Tank not saved',
        error instanceof Error ? error.message : 'Could not save this tank.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function makeDefault(id: number) {
    try {
      await setDefaultTankId(id);
      setDefaultTankIdState(id);
    } catch (error) {
      console.error(error);
      Alert.alert('Default not saved', 'Could not update the default tank.');
    }
  }

  async function testTank(id: number) {
    await makeDefault(id);
    router.push('/add-test' as never);
  }

  function startEditing(tank: TankSummary) {
    setEditingTankId(tank.id);
    setEditName(tank.name);
    setEditNotes(tank.notes ?? '');
  }

  function cancelEditing() {
    setEditingTankId(null);
    setEditName('');
    setEditNotes('');
  }

  async function saveTankEdits(id: number) {
    if (!editName.trim()) {
      Alert.alert('Tank name required', 'Give this tank a name before saving.');
      return;
    }

    try {
      setIsUpdating(true);
      await updateTank(id, editName, editNotes);
      cancelEditing();
      await loadTanks();
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Tank not updated',
        error instanceof Error ? error.message : 'Could not update this tank.',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  function confirmDelete(tank: TankSummary) {
    Alert.alert('Delete tank?', `Delete ${tank.name}? Tanks with saved tests cannot be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTank(tank.id);
            await loadTanks();
          } catch (error) {
            console.error(error);
            Alert.alert(
              'Tank not deleted',
              error instanceof Error ? error.message : 'Could not delete this tank.',
            );
          }
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Tanks</Text>
      <Text style={styles.subtitle}>Create tanks first, then scope each water test to one tank.</Text>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Add Tank</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Tank name</Text>
          <TextInput
            style={styles.input}
            value={tankName}
            onChangeText={setTankName}
            placeholder="Example: Living Room 20g"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            multiline
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional tank details"
            textAlignVertical="top"
          />
        </View>
        <Pressable style={styles.primaryButton} onPress={addTank} disabled={isSaving}>
          <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Add Tank'}</Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {tanks.map((tank) => {
        const isDefault = tank.id === defaultTankId;
        const isEditing = tank.id === editingTankId;

        return (
          <View key={tank.id} style={styles.card}>
            {isEditing ? (
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Tank name</Text>
                  <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    multiline
                    style={[styles.input, styles.notesInput]}
                    value={editNotes}
                    onChangeText={setEditNotes}
                    textAlignVertical="top"
                  />
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => saveTankEdits(tank.id)}
                    disabled={isUpdating}>
                    <Text style={styles.primaryButtonText}>
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={cancelEditing}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleBlock}>
                    <Text style={styles.tankName}>{tank.name}</Text>
                    <Text style={styles.mutedText}>
                      {tank.test_count} {tank.test_count === 1 ? 'test' : 'tests'} • Last:{' '}
                      {formatDate(tank.latest_tested_at)}
                    </Text>
                  </View>
                  {isDefault ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  ) : null}
                </View>

                {tank.notes ? <Text style={styles.notes}>{tank.notes}</Text> : null}

                <View style={styles.actions}>
                  <Pressable style={styles.secondaryButton} onPress={() => testTank(tank.id)}>
                    <Text style={styles.secondaryButtonText}>Test</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={() => startEditing(tank)}>
                    <Text style={styles.secondaryButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryButton} onPress={() => makeDefault(tank.id)}>
                    <Text style={styles.secondaryButtonText}>Make Default</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.deleteButton, tank.test_count > 0 ? styles.disabledButton : null]}
                    onPress={() => confirmDelete(tank)}
                    disabled={tank.test_count > 0}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AquariumTheme.screen,
    flexGrow: 1,
    gap: 14,
    padding: 20,
    paddingTop: 64,
  },
  title: {
    color: AquariumTheme.primaryDark,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: AquariumTheme.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    gap: 12,
    padding: 16,
    shadowColor: AquariumTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  panelTitle: {
    color: AquariumTheme.primaryDark,
    fontSize: 20,
    fontWeight: '700',
  },
  field: {
    gap: 6,
  },
  label: {
    color: AquariumTheme.text,
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    color: AquariumTheme.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  notesInput: {
    minHeight: 76,
  },
  card: {
    backgroundColor: AquariumTheme.surface,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 1,
    gap: 12,
    padding: 16,
    shadowColor: AquariumTheme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  tankName: {
    color: AquariumTheme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  mutedText: {
    color: AquariumTheme.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  notes: {
    color: AquariumTheme.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  defaultBadge: {
    backgroundColor: AquariumTheme.surfaceMint,
    borderColor: AquariumTheme.teal,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  defaultBadgeText: {
    color: AquariumTheme.teal,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: AquariumTheme.primary,
    borderRadius: 8,
    padding: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: AquariumTheme.surfaceBlue,
    borderColor: AquariumTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: AquariumTheme.primary,
    fontWeight: '700',
  },
  deleteButton: {
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  deleteButtonText: {
    color: '#b42318',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  errorText: {
    color: AquariumTheme.danger,
    fontSize: 15,
  },
});
