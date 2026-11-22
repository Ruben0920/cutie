import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { CalendarPlus, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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
import { colors, spacing } from '@/theme/colors';
import type { CyclePhaseEnum, CycleStatusResponse } from '@/types/api';

const PHASE_META: Record<
  CyclePhaseEnum,
  { accent: string; tint: string }
> = {
  menstrual: { accent: '#E11D48', tint: '#FFF1F2' },
  follicular: { accent: '#059669', tint: '#ECFDF5' },
  ovulation: { accent: '#D97706', tint: '#FFFBEB' },
  luteal: { accent: '#7C3AED', tint: '#F5F3FF' },
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
};

const addDaysIso = (iso: string, days: number): string => {
  const dt = parseIsoDate(iso);
  dt.setDate(dt.getDate() + days);
  return toIsoDate(dt);
};

const formatShortDate = (iso: string, locale: string): string => {
  const dt = parseIsoDate(iso);
  return dt.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

interface CalendarCell {
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  // Monday = 0 ... Sunday = 6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - startOffset);

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalSlots = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < totalSlots; i += 1) {
    const cellDate = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    cells.push({
      iso: toIsoDate(cellDate),
      dayNumber: cellDate.getDate(),
      inCurrentMonth: cellDate.getMonth() === monthIndex,
    });
  }
  return cells;
}

interface AdaptiveCycleCalendarProps {
  cycleStatus: CycleStatusResponse;
}

export function AdaptiveCycleCalendar({
  cycleStatus,
}: AdaptiveCycleCalendarProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIsoDate(today), [today]);

  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState(today);

  const logPeriodMutation = useMutation({
    mutationFn: (startDate: string) =>
      cycleApi.logPeriodStart({ start_date: startDate }),
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ['cycleStatus'] });
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      setPickerOpen(false);
      setSelectedIso(null);
    },
  });

  const phaseStyle = PHASE_META[cycleStatus.current_phase];
  const roundedTotal = Math.round(cycleStatus.expected_cycle_length_wma);

  const weekdays = useMemo(() => {
    const raw = t('cycle.weekdays', { returnObjects: true });
    return Array.isArray(raw)
      ? (raw as string[])
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }, [t]);

  const monthTitle = useMemo(() => {
    const dt = new Date(displayYear, displayMonth, 1);
    return dt.toLocaleDateString(i18n.language, {
      month: 'long',
      year: 'numeric',
    });
  }, [displayYear, displayMonth, i18n.language]);

  const cells = useMemo(
    () => buildMonthGrid(displayYear, displayMonth),
    [displayYear, displayMonth],
  );

  // Build lookup sets for logged period days, predicted window days, and ovulation window days.
  const { loggedDays, predictedDays, predictedCenter, ovulationDays } = useMemo(() => {
    const logged = new Set<string>();
    const logs = cycleStatus.recent_logs ?? [];
    for (const entry of logs) {
      const endIso = entry.end_date ?? addDaysIso(entry.start_date, 4);
      let cursor = entry.start_date;
      let guard = 0;
      while (cursor <= endIso && guard < 14) {
        logged.add(cursor);
        cursor = addDaysIso(cursor, 1);
        guard += 1;
      }
    }

    const predicted = new Set<string>();
    const winStart = cycleStatus.next_period_floating_window.start;
    const winEnd = cycleStatus.next_period_floating_window.end;
    let cursor = winStart;
    let guard = 0;
    while (cursor <= winEnd && guard < 15) {
      predicted.add(cursor);
      cursor = addDaysIso(cursor, 1);
      guard += 1;
    }

    // Ovulation typically spans ~16 to 12 days prior to next expected period start
    const ovulation = new Set<string>();
    const latestStart =
      logs.length > 0
        ? logs[0].start_date
        : addDaysIso(todayIso, -(cycleStatus.day_of_cycle - 1));
    const ovuOffsetStart = Math.max(8, roundedTotal - 16);
    const ovuOffsetEnd = Math.max(ovuOffsetStart + 2, roundedTotal - 12);
    for (let offset = ovuOffsetStart; offset <= ovuOffsetEnd; offset += 1) {
      const iso = addDaysIso(latestStart, offset);
      if (!logged.has(iso) && !predicted.has(iso)) {
        ovulation.add(iso);
      }
    }

    return {
      loggedDays: logged,
      predictedDays: predicted,
      predictedCenter: cycleStatus.next_period_floating_window.center,
      ovulationDays: ovulation,
    };
  }, [cycleStatus, roundedTotal, todayIso]);

  const shiftMonth = (delta: number): void => {
    void Haptics.selectionAsync();
    const next = new Date(displayYear, displayMonth + delta, 1);
    setDisplayYear(next.getFullYear());
    setDisplayMonth(next.getMonth());
  };

  const handleLogButtonPress = (): void => {
    if (selectedIso) {
      void Haptics.selectionAsync();
      logPeriodMutation.mutate(selectedIso);
      return;
    }
    setPickedDate(today);
    setPickerOpen(true);
  };

  return (
    <View style={styles.card}>
      {/* Phase & Day Pill + Month Switcher */}
      <View style={styles.topBar}>
        <View style={[styles.phasePill, { backgroundColor: phaseStyle.tint }]}>
          <View
            style={[styles.phaseDot, { backgroundColor: phaseStyle.accent }]}
          />
          <Text style={[styles.phaseText, { color: phaseStyle.accent }]}>
            {t(`cycle.phases.${cycleStatus.current_phase}`)} ·{' '}
            {t('cycle.dayOfCycle', {
              day: cycleStatus.day_of_cycle,
              total: roundedTotal,
            })}
          </Text>
        </View>
      </View>

      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>{monthTitle}</Text>
        <View style={styles.monthNav}>
          <Pressable
            style={({ pressed }) => [
              styles.navBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => shiftMonth(-1)}
            hitSlop={8}
          >
            <ChevronLeft size={18} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.navBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => shiftMonth(1)}
            hitSlop={8}
          >
            <ChevronRight size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Weekday Row */}
      <View style={styles.weekdayRow}>
        {weekdays.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <Text style={styles.weekdayLabel}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Days Grid */}
      <View style={styles.daysGrid}>
        {cells.map((cell) => {
          const isPeriod = loggedDays.has(cell.iso);
          const isPredicted = predictedDays.has(cell.iso);
          const isOvulation = ovulationDays.has(cell.iso);
          const isToday = cell.iso === todayIso;
          const isSelected = cell.iso === selectedIso;
          const isCenter = cell.iso === predictedCenter;
          const canSelect = cell.iso <= todayIso;

          let bgColor = 'transparent';
          let textColor: string = cell.inCurrentMonth
            ? colors.textPrimary
            : colors.textMuted;
          let borderColor = 'transparent';

          if (isPeriod) {
            bgColor = '#E11D48';
            textColor = colors.white;
          } else if (isPredicted) {
            bgColor = '#FCE7F3';
            textColor = '#9D174D';
            borderColor = '#F472B6';
          } else if (isOvulation) {
            bgColor = '#FEF3C7';
            textColor = '#B45309';
          }

          if (isToday && !isPeriod) {
            borderColor = colors.textPrimary;
          }
          if (isSelected) {
            borderColor = colors.primaryDark;
          }

          return (
            <View key={cell.iso} style={styles.daySlot}>
              <Pressable
                disabled={!canSelect}
                style={({ pressed }) => [
                  styles.dayCell,
                  { backgroundColor: bgColor, borderColor },
                  isPredicted && styles.predictedCell,
                  isToday && !isPeriod && styles.todayCell,
                  isSelected && styles.selectedCell,
                  !cell.inCurrentMonth && !isPeriod && styles.outsideMonth,
                  pressed && canSelect && styles.pressed,
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelectedIso((prev) =>
                    prev === cell.iso ? null : cell.iso,
                  );
                }}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: textColor },
                    (isPeriod || isToday || isSelected) && styles.dayTextBold,
                  ]}
                >
                  {cell.dayNumber}
                </Text>
                {(isToday || isCenter) && (
                  <View
                    style={[
                      styles.markerDot,
                      {
                        backgroundColor: isPeriod
                          ? colors.white
                          : isCenter && !isToday
                            ? '#DB2777'
                            : colors.textPrimary,
                      },
                    ]}
                  />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E11D48' }]} />
          <Text style={styles.legendLabel}>{t('cycle.legendPeriod')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: '#FCE7F3',
                borderWidth: 1,
                borderColor: '#F472B6',
              },
            ]}
          />
          <Text style={styles.legendLabel}>{t('cycle.legendPredicted')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FDE68A' }]} />
          <Text style={styles.legendLabel}>{t('cycle.legendOvulation')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: colors.white,
                borderWidth: 1.5,
                borderColor: colors.textPrimary,
              },
            ]}
          />
          <Text style={styles.legendLabel}>{t('cycle.legendToday')}</Text>
        </View>
      </View>

      {/* Predicted Floating Window Summary + Log Start Action */}
      <View style={styles.footerBox}>
        <Text style={styles.windowText}>
          {t('cycle.floatingWindow', {
            start: formatShortDate(
              cycleStatus.next_period_floating_window.start,
              i18n.language,
            ),
            end: formatShortDate(
              cycleStatus.next_period_floating_window.end,
              i18n.language,
            ),
          })}
        </Text>
        <Text style={styles.hintText}>{t('cycle.tapDayHint')}</Text>

        <Pressable
          style={({ pressed }) => [
            styles.logBtn,
            pressed && styles.pressed,
          ]}
          disabled={logPeriodMutation.isPending}
          onPress={handleLogButtonPress}
        >
          {logPeriodMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <View style={styles.logBtnInner}>
              <CalendarPlus size={16} color={colors.white} strokeWidth={2} />
              <Text style={styles.logBtnText}>
                {selectedIso
                  ? t('cycle.logSelectedDate', {
                      date: formatShortDate(selectedIso, i18n.language),
                    })
                  : t('cycle.logPeriodStart')}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('cycle.logPeriodStart')}</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <DateTimePicker
              value={pickedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={today}
              onChange={(_event, date) => {
                if (date) setPickedDate(date);
              }}
            />

            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && styles.pressed,
              ]}
              disabled={logPeriodMutation.isPending}
              onPress={() => {
                logPeriodMutation.mutate(toIsoDate(pickedDate));
              }}
            >
              {logPeriodMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmBtnText}>{t('common.save')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  monthNav: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#F3F1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  weekdayCell: {
    width: '14.2857%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  daySlot: {
    width: '14.2857%',
    aspectRatio: 1,
    padding: 2.5,
  },
  dayCell: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  predictedCell: {
    borderStyle: 'dashed',
  },
  todayCell: {
    borderWidth: 1.5,
  },
  selectedCell: {
    borderWidth: 2,
  },
  outsideMonth: {
    opacity: 0.36,
  },
  dayText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  dayTextBold: {
    fontWeight: '800',
  },
  markerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendLabel: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  footerBox: {
    backgroundColor: '#F7F5FA',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  windowText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  logBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 2,
  },
  logBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  logBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,24,0.38)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
