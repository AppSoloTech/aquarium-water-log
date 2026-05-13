import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, Section, TextField } from '@/components/ui';
import {
  createTank,
  deleteTank,
  getTankSummaries,
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
  const [showAddTankForm, setShowAddTankForm] = useState(false);
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
      const summaries = await getTankSummaries();
      setTanks(summaries);
      if (summaries.length === 0) {
        setShowAddTankForm(true);
      }
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
    if (isSaving) {
      return;
    }

    if (!tankName.trim()) {
      Alert.alert('Tank name required', 'Give this tank a name before saving.');
      return;
    }

    try {
      setIsSaving(true);
      await createTank(tankName, notes);
      setTankName('');
      setNotes('');
      setShowAddTankForm(false);
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

  function testTank(id: number) {
    router.push({ pathname: '/add-test', params: { tankId: String(id) } } as never);
  }

  function viewHistory(id: number) {
    router.push({ pathname: '/history', params: { tankId: String(id) } } as never);
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
        trailing={
          <Button
            label={showAddTankForm ? 'Close' : 'Add Tank'}
            size="sm"
            variant={showAddTankForm ? 'ghost' : 'secondary'}
            leftIcon={showAddTankForm ? 'xmark' : 'plus'}
            onPress={() => setShowAddTankForm((current) => !current)}
            accessibilityHint={showAddTankForm ? 'Hides the add tank form' : 'Shows the add tank form'}
          />
        }
      />

      {showAddTankForm ? (
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
      ) : null}

      {errorMessage ? (
        <Card variant="warning" padding="md" elevation="none">
          <Text style={[theme.typography.bodyMd, { color: theme.colors.danger }]}>{errorMessage}</Text>
        </Card>
      ) : null}

      {tanks.map((tank) => {
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
                label="History"
                size="sm"
                variant="secondary"
                leftIcon="list.bullet"
                onPress={() => viewHistory(tank.id)}
                accessibilityLabel={`View history for ${tank.name}`}
              />
              <Button
                label="Edit"
                size="sm"
                variant="secondary"
                leftIcon="pencil"
                onPress={() => startEditing(tank)}
                accessibilityLabel={`Edit ${tank.name}`}
              />
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
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  flex1: { flex: 1 },
});
