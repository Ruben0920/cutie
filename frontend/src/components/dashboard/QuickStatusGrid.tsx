import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { interactionsApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radii, spacing } from '@/theme/colors';
import type { QuickStatusEnum } from '@/types/api';

const QUICK_STATUSES: QuickStatusEnum[] = [
  'going_home',
  'high_energy',
  'tired',
  'hungry',
  'need_hugs',
  'busy',
];

interface QuickStatusGridProps {
  currentStatus: QuickStatusEnum | null;
}

export function QuickStatusGrid({
  currentStatus,
}: QuickStatusGridProps): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [optimisticStatus, setOptimisticStatus] =
    useState<QuickStatusEnum | null>(null);

  const statusMutation = useMutation({
    mutationFn: interactionsApi.updateStatus,
    onSuccess: async (res) => {
      await updateUser(res.user);
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
    },
    onSettled: () => {
      setOptimisticStatus(null);
    },
  });

  const activeStatus = optimisticStatus ?? currentStatus;

  const handlePress = async (status: QuickStatusEnum): Promise<void> => {
    setOptimisticStatus(status);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    statusMutation.mutate(status);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.quickStatusTitle')}</Text>
      <View style={styles.grid}>
        {QUICK_STATUSES.map((status) => {
          const active = activeStatus === status;
          return (
            <Pressable
              key={status}
              style={[styles.button, active && styles.buttonActive]}
              onPress={() => {
                void handlePress(status);
              }}
            >
              <Text
                style={[styles.buttonText, active && styles.buttonTextActive]}
              >
                {t(`statuses.${status}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{t('home.quickStatusHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  buttonTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
