import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, cyclePhaseColors, radii, spacing } from '@/theme/colors';
import type { CoupleDashboard, CycleStatusResponse } from '@/types/api';

interface CalibrationStatusHUDProps {
  dashboard: CoupleDashboard | undefined;
  cycleStatus: CycleStatusResponse | undefined;
}

export function CalibrationStatusHUD({
  dashboard,
  cycleStatus,
}: CalibrationStatusHUDProps): React.JSX.Element {
  const { t } = useTranslation();

  const activePartners = (dashboard?.partners ?? []).filter(
    (p) => p.current_status !== null,
  );

  const phaseStyle = cycleStatus
    ? cyclePhaseColors[cycleStatus.current_phase]
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('dice.calibrationTitle')}</Text>
      <View style={styles.pillsWrap}>
        {cycleStatus && phaseStyle ? (
          <View style={[styles.pill, { backgroundColor: phaseStyle.soft }]}>
            <Text style={[styles.pillText, { color: phaseStyle.main }]}>
              {t('dice.cyclePill', {
                phase: t(`cycle.phases.${cycleStatus.current_phase}`),
              })}
            </Text>
          </View>
        ) : null}

        {activePartners.map((partner) => (
          <View key={partner.id} style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {partner.name}:{' '}
              {partner.current_status
                ? t(`statuses.${partner.current_status}`)
                : ''}
            </Text>
          </View>
        ))}

        {dashboard?.relationship_format === 'long_distance' ? (
          <View style={styles.ldPill}>
            <Text style={styles.ldPillText}>{t('dice.longDistancePill')}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  ldPill: {
    backgroundColor: colors.secondarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  ldPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
});
