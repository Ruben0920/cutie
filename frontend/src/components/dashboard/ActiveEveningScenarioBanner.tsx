import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Sparkles, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { datesApi } from '@/api/endpoints';
import { colors, radii, spacing } from '@/theme/colors';
import type { DateIdea } from '@/types/api';

interface ActiveEveningScenarioBannerProps {
  scenario: DateIdea | null;
  currentUserId: string;
}

export function ActiveEveningScenarioBanner({
  scenario,
  currentUserId,
}: ActiveEveningScenarioBannerProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const clearMutation = useMutation({
    mutationFn: datesApi.clearActiveScenario,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
    },
  });

  if (!scenario) {
    return null;
  }

  const lockedByMe = scenario.creator_id === currentUserId;
  const maskedSurprise = scenario.is_surprise && !lockedByMe;

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View style={styles.badge}>
          {maskedSurprise ? (
            <Lock size={13} color={colors.accentGold} strokeWidth={1.9} />
          ) : (
            <Sparkles size={13} color={colors.primary} strokeWidth={1.9} />
          )}
          <Text style={styles.badgeText}>
            {t(`categories.${scenario.category}`)}
          </Text>
        </View>
        <Pressable
          style={styles.clearBtn}
          onPress={() => clearMutation.mutate()}
          disabled={clearMutation.isPending}
        >
          <X size={14} color={colors.textSecondary} />
          <Text style={styles.clearText}>{t('home.clearScenario')}</Text>
        </Pressable>
      </View>

      <Text style={styles.heroTitle}>
        {lockedByMe
          ? t('home.scenarioByMe', { title: scenario.title })
          : t('home.scenarioByPartner', { title: scenario.title })}
      </Text>

      {scenario.description ? (
        <Text style={styles.heroDescription}>{scenario.description}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.2)',
    gap: spacing.xs + 2,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  heroDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});
