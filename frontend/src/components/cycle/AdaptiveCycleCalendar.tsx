import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { CalendarDays } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { cycleApi } from '@/api/endpoints';
import { colors, cyclePhaseColors, radii, spacing } from '@/theme/colors';
import type { CycleStatusResponse } from '@/types/api';

interface AdaptiveCycleCalendarProps {
  cycleStatus: CycleStatusResponse;
}

function toIsoDateString(dateObj: Date): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AdaptiveCycleCalendar({
  cycleStatus,
}: AdaptiveCycleCalendarProps): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const logMutation = useMutation({
    mutationFn: cycleApi.logPeriodStart,
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ['cycleStatus'] });
      setPickerOpen(false);
    },
  });

  const phaseStyle = cyclePhaseColors[cycleStatus.current_phase];
  const roundedTotal = Math.max(1, Math.round(cycleStatus.expected_cycle_length_wma));
  const progressRatio = Math.min(1, cycleStatus.day_of_cycle / roundedTotal);

  const handlePickerChange = (
    _event: DateTimePickerEvent,
    picked?: Date,
  ): void => {
    if (picked) setSelectedDate(picked);
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View
            style={[styles.phaseBadge, { backgroundColor: phaseStyle.soft }]}
          >
            <Text style={[styles.phaseText, { color: phaseStyle.main }]}>
              {t(`cycle.phases.${cycleStatus.current_phase}`)}
            </Text>
          </View>
          <Text style={styles.dayText}>
            {t('cycle.dayOfCycle', {
              day: cycleStatus.day_of_cycle,
              total: roundedTotal,
            })}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(progressRatio * 100)}%`,
                backgroundColor: phaseStyle.main,
              },
            ]}
          />
        </View>

        <View style={styles.windowCard}>
          <View style={styles.windowHeader}>
            <CalendarDays size={16} color={colors.secondary} />
            <Text style={styles.windowTitle}>
              {cycleStatus.next_period_floating_window.start} →{' '}
              {cycleStatus.next_period_floating_window.end}
            </Text>
          </View>
          <Text style={styles.windowCenter}>
            Center prediction: {cycleStatus.next_period_floating_window.center}{' '}
            (WMA: {cycleStatus.expected_cycle_length_wma}d)
          </Text>
          <Text style={styles.windowCaption}>{t('cycle.floatingWindow')}</Text>
        </View>

        <Pressable
          style={styles.logButton}
          onPress={() => {
            setSelectedDate(new Date());
            setPickerOpen(true);
          }}
        >
          <Text style={styles.logButtonText}>{t('cycle.logPeriodStart')}</Text>
        </Pressable>
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('cycle.logPeriodStart')}</Text>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handlePickerChange}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setPickerOpen(false)}
              >
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={styles.saveBtn}
                onPress={() =>
                  logMutation.mutate({
                    start_date: toIsoDateString(selectedDate),
                  })
                }
                disabled={logMutation.isPending}
              >
                {logMutation.isPending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.saveText}>{t('common.save')}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  phaseText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  windowCard: {
    backgroundColor: colors.secondarySoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 4,
  },
  windowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  windowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.secondary,
  },
  windowCenter: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  windowCaption: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  logButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  logButtonText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveText: {
    color: colors.white,
    fontWeight: '700',
  },
});
