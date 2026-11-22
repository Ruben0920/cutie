import {
  Dices,
  Heart,
  Sparkles,
  Utensils,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/colors';
import type { CycleStatusResponse } from '@/types/api';

interface PhaseInsightCardProps {
  cycleStatus: CycleStatusResponse;
}

export function PhaseInsightCard({
  cycleStatus,
}: PhaseInsightCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const { dice_filter_rules } = cycleStatus;

  const allowedEnergy = dice_filter_rules.allowed_energy
    .map((e) => t(`energy.${e}`))
    .join(' · ');

  const preferredCats = dice_filter_rules.preferred_categories.map((c) =>
    t(`categories.${c}`),
  );

  const excludedCats = dice_filter_rules.excluded_categories.map((c) =>
    t(`categories.${c}`),
  );

  return (
    <View style={styles.section}>
      {/* Section Heading */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('cycle.guideTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('cycle.guideSubtitle')}</Text>
      </View>

      {/* Mood, Care & Cravings Explanation Card */}
      <View style={styles.card}>
        <View style={styles.rowHeader}>
          <View style={[styles.iconBadge, { backgroundColor: '#FCEEF3' }]}>
            <Sparkles size={16} color="#DB2777" strokeWidth={1.9} />
          </View>
          <Text style={styles.cardTitle}>{t('cycle.wellbeing')}</Text>
        </View>
        <Text style={styles.bodyText}>{cycleStatus.wellbeing_summary}</Text>

        <View style={styles.innerDivider} />

        <View style={styles.rowHeader}>
          <View style={[styles.iconBadge, { backgroundColor: '#FEF7E6' }]}>
            <Utensils size={16} color="#D97706" strokeWidth={1.9} />
          </View>
          <Text style={styles.cardTitle}>{t('cycle.food')}</Text>
        </View>
        <View style={styles.chipsWrap}>
          {cycleStatus.food_preferences.map((item) => (
            <View key={item} style={styles.foodChip}>
              <Text style={styles.foodChipText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.innerDivider} />

        <View style={styles.rowHeader}>
          <View style={[styles.iconBadge, { backgroundColor: '#F3EEFC' }]}>
            <Heart size={16} color="#7C3AED" strokeWidth={1.9} />
          </View>
          <Text style={styles.cardTitle}>{t('cycle.loveLanguage')}</Text>
        </View>
        <Text style={styles.highlightValue}>
          {t(`loveLanguages.${cycleStatus.love_language}`)}
        </Text>
        <Text style={styles.mutedBody}>
          {t(`loveLanguages.tips.${cycleStatus.love_language}`)}
        </Text>
      </View>

      {/* Separate Smart Dice & Ideas Adaptation Card */}
      <View style={[styles.card, styles.diceCard]}>
        <View style={styles.rowHeader}>
          <View style={[styles.iconBadge, { backgroundColor: '#EEF4FD' }]}>
            <Dices size={16} color="#2563EB" strokeWidth={1.9} />
          </View>
          <Text style={styles.cardTitle}>{t('cycle.diceImpact')}</Text>
        </View>

        <Text style={styles.mutedBody}>{t('cycle.diceRulesExplain')}</Text>

        <View style={styles.ruleRow}>
          <Text style={styles.ruleLabel}>{t('cycle.allowedEnergyLabel')}</Text>
          <View style={styles.ruleValuePill}>
            <Text style={styles.ruleValueText}>{allowedEnergy}</Text>
          </View>
        </View>

        <View style={styles.ruleColumn}>
          <Text style={styles.ruleLabel}>
            {t('cycle.boostedCategoriesLabel')}
          </Text>
          <View style={styles.chipsWrap}>
            {preferredCats.length > 0 ? (
              preferredCats.map((cat) => (
                <View key={cat} style={styles.boostedChip}>
                  <Text style={styles.boostedChipText}>{cat}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noneText}>{t('cycle.noneLabel')}</Text>
            )}
          </View>
        </View>

        <View style={styles.ruleColumn}>
          <Text style={styles.ruleLabel}>
            {t('cycle.pausedCategoriesLabel')}
          </Text>
          <View style={styles.chipsWrap}>
            {excludedCats.length > 0 ? (
              excludedCats.map((cat) => (
                <View key={cat} style={styles.pausedChip}>
                  <Text style={styles.pausedChipText}>{cat}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noneText}>{t('cycle.noneLabel')}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: 2,
    gap: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: spacing.lg,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  diceCard: {
    backgroundColor: '#FAFBFD',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bodyText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  mutedBody: {
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  highlightValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
  },
  innerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginVertical: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  foodChip: {
    backgroundColor: '#FEF7E6',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  foodChipText: {
    color: '#B45309',
    fontSize: 12.5,
    fontWeight: '600',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginTop: 2,
  },
  ruleColumn: {
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  ruleLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  ruleValuePill: {
    backgroundColor: '#EEF4FD',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ruleValueText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  boostedChip: {
    backgroundColor: '#ECFDF5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  boostedChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#047857',
  },
  pausedChip: {
    backgroundColor: '#F3F1F6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pausedChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  noneText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
