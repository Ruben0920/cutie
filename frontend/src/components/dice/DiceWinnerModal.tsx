import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Lock, Sparkles, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { datesApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, energyColors, radii, spacing } from '@/theme/colors';
import type { DiceRollResponse } from '@/types/api';

interface DiceWinnerModalProps {
  visible: boolean;
  result: DiceRollResponse | null;
  onClose: () => void;
  onReroll: () => void;
}

export function DiceWinnerModal({
  visible,
  result,
  onClose,
  onReroll,
}: DiceWinnerModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const approveMutation = useMutation({
    mutationFn: datesApi.selectForTonight,
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      onClose();
      router.push('/(tabs)/home');
    },
  });

  if (!result) {
    return <Modal visible={false} />;
  }

  const { winning_idea, calibration_explanation, fallback_applied } = result;
  const isMaskedSurprise =
    winning_idea.is_surprise && winning_idea.creator_id !== currentUser?.id;
  const energyStyle = energyColors[winning_idea.required_energy];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[styles.card, isMaskedSurprise && styles.surpriseCard]}
        >
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <X size={20} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.topBadges}>
            <View style={styles.catBadge}>
              {isMaskedSurprise ? (
                <Lock size={14} color={colors.accentGold} />
              ) : (
                <Sparkles size={14} color={colors.primary} />
              )}
              <Text style={styles.catText}>
                {t(`categories.${winning_idea.category}`)}
              </Text>
            </View>

            <View
              style={[
                styles.energyBadge,
                { backgroundColor: energyStyle.soft },
              ]}
            >
              <Text style={[styles.energyText, { color: energyStyle.main }]}>
                {t(`energy.${winning_idea.required_energy}`)}
              </Text>
            </View>
          </View>

          <Text style={styles.winnerTitle}>{winning_idea.title}</Text>
          {winning_idea.description ? (
            <Text style={styles.winnerDesc}>{winning_idea.description}</Text>
          ) : null}

          <View style={styles.explanationBox}>
            <Text style={styles.explanationHeading}>
              {t('dice.calibrationTitle')}
            </Text>
            <Text style={styles.explanationBody}>
              {calibration_explanation.reason_summary}
            </Text>
            {fallback_applied ? (
              <Text style={styles.fallbackNotice}>
                * Fallback rules applied to ensure an option matched.
              </Text>
            ) : null}
          </View>

          <Pressable
            style={[
              styles.approveBtn,
              approveMutation.isPending && styles.disabled,
            ]}
            onPress={() => approveMutation.mutate(winning_idea.id)}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.approveText}>{t('dice.approveTonight')}</Text>
            )}
          </Pressable>

          <Pressable style={styles.rerollBtn} onPress={onReroll}>
            <Text style={styles.rerollText}>{t('dice.reroll')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 24, 0.58)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  surpriseCard: {
    borderWidth: 2,
    borderColor: colors.accentGold,
    backgroundColor: colors.secondarySoft,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  topBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  catText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  energyBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  energyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  winnerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  winnerDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  explanationBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  explanationHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  explanationBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  fallbackNotice: {
    fontSize: 11,
    color: colors.accentGold,
    fontWeight: '600',
  },
  approveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  approveText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  rerollBtn: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  rerollText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});
