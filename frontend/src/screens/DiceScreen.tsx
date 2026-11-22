import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { interactionsApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { AnimatedDiceCube } from '@/components/dice/AnimatedDiceCube';
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

      await delay(150);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await delay(580);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await delay(250);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await delay(220);

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('dice.title')}</Text>

      <View style={styles.stageArea}>
        <AnimatedDiceCube
          isRolling={isRolling}
          onPress={() => {
            void handleRoll();
          }}
        />
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </View>

      <View style={styles.bottomArea}>
        <Pressable
          style={({ pressed }) => [
            styles.rollButton,
            isRolling && styles.disabled,
            pressed && styles.rollButtonPressed,
          ]}
          onPress={() => {
            void handleRoll();
          }}
          disabled={isRolling}
        >
          <Text style={styles.rollButtonText}>{t('dice.rollButton')}</Text>
        </Pressable>
      </View>

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
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 58,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stageArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
    gap: spacing.md,
    overflow: 'visible',
    zIndex: 2,
  },
  bottomArea: {
    paddingBottom: 8,
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    fontWeight: '600',
  },
  rollButton: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  rollButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.7,
  },
  rollButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
