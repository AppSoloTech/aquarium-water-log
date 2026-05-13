import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, Section, TextField } from '@/components/ui';
import {
  createTank,
  deleteTank,
  getDefaultTankId,
  getTankSummaries,
  setDefaultTankId,
  type TankSummary,
  updateTank,
} from '@/lib/database';
import { useTheme } from '@/theme';

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'No tests yet';
}

export default function TanksScreen() {
  const router = useRouter();
  const theme = useTheme();
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
    <Screen keyboardAvoiding>
      <Section
        title="Tanks"
        subtitle="Create tanks first, then scope each water test to one tank."
      />

      <Card variant="standard" padding="md" elevation="sm">
        <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>Add Tank</Text>
        <TextField
          label="Tank name"
          value={tankName}
          onChangeText={setTankName}
          placeholder="Example: Living Room 20g"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional tank details"
          multiline
        />
        <Button
          label={isSaving ? 'Saving...' : 'Add Tank'}
          onPress={addTank}
          loading={isSaving}
          leftIcon="plus"
          fullWidth
        />
      </Card>

      {errorMessage ? (
        <Card variant="warning" padding="md" elevation="none">
          <Text style={[theme.typography.bodyMd, { color: theme.colors.danger }]}>{errorMessage}</Text>
        </Card>
      ) : null}

      {tanks.map((tank) => {
        const isDefault = tank.id === defaultTankId;
        const isEditing = tank.id === editingTankId;
        const hasTests = tank.test_count > 0;

        if (isEditing) {
          return (
            <Card key={tank.id} variant="standard" padding="md" elevation="sm">
              <TextField
                label="Tank name"
                value={editName}
                onChangeText={setEditName}
                autoCapitalize="words"
              />
              <TextField
                label="Notes"
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
              />
              <View style={[styles.actions, { gap: theme.spacing.sm }]}>
                <Button
                  label={isUpdating ? 'Saving...' : 'Save Changes'}
                  onPress={() => saveTankEdits(tank.id)}
                  loading={isUpdating}
                  fullWidth
                  style={styles.flex1}
                />
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={cancelEditing}
                  haptic="none"
                  fullWidth
                  style={styles.flex1}
                />
              </View>
            </Card>
          );
        }

        return (
          <Card key={tank.id} variant="standard" padding="md" elevation="sm">
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={[theme.typography.titleMd, { color: theme.colors.text }]}>
                  {tank.name}
                </Text>
                <Text style={[theme.typography.bodySm, { color: theme.colors.textMuted }]}>
                  {tank.test_count} {tank.test_count === 1 ? 'test' : 'tests'} • Last:{' '}
                  {formatDate(tank.latest_tested_at)}
                </Text>
              </View>
              {isDefault ? (
                <View
                  style={[
                    styles.defaultPill,
                    {
                      backgroundColor: theme.colors.surfaceAccent,
                      borderColor: theme.colors.borderAccent,
                      borderRadius: theme.radius.pill,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: 2,
                    },
                  ]}
                  accessibilityLabel="Default tank"
                  accessibilityRole="text">
                  <Text style={[theme.typography.caption, { color: theme.colors.accent }]}>
                    Default
                  </Text>
                </View>
              ) : null}
            </View>

            {tank.notes ? (
              <Text style={[theme.typography.bodyMd, { color: theme.colors.textMuted }]}>
                {tank.notes}
              </Text>
            ) : null}

            <View style={[styles.actions, { gap: theme.spacing.sm }]}>
              <Button
                label="Test"
                size="sm"
                leftIcon="plus.circle.fill"
                onPress={() => testTank(tank.id)}
                accessibilityLabel={`Log test for ${tank.name}`}
              />
              <Button
                label="Edit"
                size="sm"
                variant="secondary"
                leftIcon="pencil"
                onPress={() => startEditing(tank)}
                accessibilityLabel={`Edit ${tank.name}`}
              />
              {isDefault ? null : (
                <Button
                  label="Make default"
                  size="sm"
                  variant="ghost"
                  leftIcon="star"
                  onPress={() => makeDefault(tank.id)}
                  accessibilityLabel={`Make ${tank.name} the default tank`}
                />
              )}
              <Button
                label="Delete"
                size="sm"
                variant="danger"
                leftIcon="trash.fill"
                onPress={() => confirmDelete(tank)}
                disabled={hasTests}
                haptic="warning"
                accessibilityLabel={`Delete ${tank.name}`}
                accessibilityHint={
                  hasTests
                    ? 'Cannot delete a tank that has saved tests'
                    : 'Permanently removes this tank'
                }
              />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  cardHeaderText: { flex: 1, gap: 2 },
  defaultPill: { borderWidth: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  flex1: { flex: 1 },
});
