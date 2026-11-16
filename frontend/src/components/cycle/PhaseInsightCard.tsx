import { Dices, Heart, Sparkles, Utensils } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/colors';
import type { CycleStatusResponse, LoveLanguageEnum } from '@/types/api';

interface PhaseInsightCardProps {
  cycleStatus: CycleStatusResponse;
}

const LOVE_LANGUAGE_TIPS: Record<LoveLanguageEnum, string> = {
  words_of_affirmation: 'Share genuine compliments and reassuring notes today.',
  quality_time: 'Put phones aside for focused, unhurried time together.',
  receiving_gifts: 'A small thoughtful treat or flower will go a long way.',
  acts_of_service: 'Take over chores, warm tea, or cozy prep without being asked.',
  physical_touch: 'Prioritize gentle hugs, cuddling, and warm physical closeness.',
};

export function PhaseInsightCard({
  cycleStatus,
}: PhaseInsightCardProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Sparkles size={16} color={colors.primary} />
          <Text style={styles.cardTitle}>{t('cycle.wellbeing')}</Text>
        </View>
        <Text style={styles.bodyText}>{cycleStatus.wellbeing_summary}</Text>

        {cycleStatus.symptom_tags.length > 0 ? (
          <View style={styles.tagsWrap}>
            {cycleStatus.symptom_tags.map((tag) => (
              <View key={tag} style={styles.symptomTag}>
                <Text style={styles.symptomText}>#{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Utensils size={16} color={colors.accentGold} />
          <Text style={styles.cardTitle}>{t('cycle.food')}</Text>
        </View>
        <View style={styles.tagsWrap}>
          {cycleStatus.food_preferences.map((item) => (
            <View key={item} style={styles.foodTag}>
              <Text style={styles.foodText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Heart size={16} color={colors.primary} />
          <Text style={styles.cardTitle}>{t('cycle.loveLanguage')}</Text>
        </View>
        <Text style={styles.loveTitle}>
          {t(`loveLanguages.${cycleStatus.love_language}`)}
        </Text>
        <Text style={styles.tipText}>
          {LOVE_LANGUAGE_TIPS[cycleStatus.love_language]}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Dices size={16} color={colors.secondary} />
          <Text style={styles.cardTitle}>{t('cycle.diceImpact')}</Text>
        </View>
        <Text style={styles.ruleLine}>
          Allowed Energy:{' '}
          {cycleStatus.dice_filter_rules.allowed_energy
            .map((e) => t(`energy.${e}`))
            .join(', ')}
        </Text>
        <Text style={styles.ruleLine}>
          Preferred:{' '}
          {cycleStatus.dice_filter_rules.preferred_categories
            .map((c) => t(`categories.${c}`))
            .join(', ')}
        </Text>
        {cycleStatus.dice_filter_rules.excluded_categories.length > 0 ? (
          <Text style={styles.excludedLine}>
            Excluded:{' '}
            {cycleStatus.dice_filter_rules.excluded_categories
              .map((c) => t(`categories.${c}`))
              .join(', ')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  bodyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  symptomTag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  symptomText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  foodTag: {
    backgroundColor: colors.accentGoldSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  foodText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accentGold,
  },
  loveTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  tipText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  ruleLine: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  excludedLine: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600',
  },
});
