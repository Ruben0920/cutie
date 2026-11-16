import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
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
}: ActiveEveningScenarioBannerProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const clearMutation = useMutation({
    mutationFn: datesApi.clearActiveScenario,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
    },
  });

  if (!scenario) {
    return (
      <Pressable
        style={styles.emptyCard}
        onPress={() => router.push('/(tabs)/ideas')}
      >
        <Sparkles size={20} color={colors.primary} />
        <Text style={styles.emptyText}>{t('home.noScenarioCta')}</Text>
      </Pressable>
    );
  }

  const lockedByMe = scenario.creator_id === currentUserId;
  const maskedSurprise = scenario.is_surprise && !lockedByMe;

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View style={styles.badge}>
          {maskedSurprise ? (
            <Lock size={14} color={colors.accentGold} />
          ) : (
            <Sparkles size={14} color={colors.primary} />
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
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  heroDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
