import { useMutation, useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { coupleApi, cycleApi, interactionsApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { AnimatedDiceCube } from '@/components/dice/AnimatedDiceCube';
import { CalibrationStatusHUD } from '@/components/dice/CalibrationStatusHUD';
import { DiceWinnerModal } from '@/components/dice/DiceWinnerModal';
import { colors, radii, spacing } from '@/theme/colors';
import type { DiceRollResponse } from '@/types/api';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DiceScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<DiceRollResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ['coupleDashboard'],
    queryFn: coupleApi.getDashboard,
  });

  const cycleQuery = useQuery({
    queryKey: ['cycleStatus'],
    queryFn: () => cycleApi.getStatus(),
  });

  const rollMutation = useMutation({
    mutationFn: () => interactionsApi.rollDice(true),
  });

  const handleRoll = async (): Promise<void> => {
    if (isRolling) return;
    setErrorMsg(null);
    setModalVisible(false);
    setIsRolling(true);

    try {
      const apiPromise = rollMutation.mutateAsync();

      for (let step = 0; step < 4; step += 1) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await delay(280);
      }

      const rollResponse = await apiPromise;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResult(rollResponse);
      setModalVisible(true);
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, t('common.error')));
    } finally {
      setIsRolling(false);
    }
  };

  if (dashboardQuery.isLoading || cycleQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('dice.title')}</Text>

      <CalibrationStatusHUD
        dashboard={dashboardQuery.data}
        cycleStatus={cycleQuery.data}
      />

      <View style={styles.stage}>
        <AnimatedDiceCube
          isRolling={isRolling}
          onPress={() => {
            void handleRoll();
          }}
        />
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <Pressable
        style={[styles.rollButton, isRolling && styles.disabled]}
        onPress={() => {
          void handleRoll();
        }}
        disabled={isRolling}
      >
        <Text style={styles.rollButtonText}>{t('dice.rollButton')}</Text>
      </Pressable>

      <DiceWinnerModal
        visible={modalVisible}
        result={result}
        onClose={() => setModalVisible(false)}
        onReroll={() => {
          void handleRoll();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: 58,
    justifyContent: 'space-between',
    gap: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    fontWeight: '600',
  },
  rollButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  disabled: {
    opacity: 0.7,
  },
  rollButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
});
