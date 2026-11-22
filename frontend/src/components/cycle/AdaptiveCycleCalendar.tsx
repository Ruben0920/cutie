import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { cycleApi } from '@/api/endpoints';
import { colors, spacing } from '@/theme/colors';
import type { CyclePhaseEnum, CycleStatusResponse } from '@/types/api';

type ProductivityKey =
  | 'restore'
  | 'deep_focus'
  | 'peak_social'
  | 'steady_flow'
  | 'light_pace';

const PRODUCTIVITY_META: Record<
  ProductivityKey,
  { color: string; tint: string }
> = {
  restore: { color: '#94A3B8', tint: '#F1F5F9' },
  deep_focus: { color: '#059669', tint: '#ECFDF5' },
  peak_social: { color: '#D97706', tint: '#FFFBEB' },
  steady_flow: { color: '#2563EB', tint: '#EFF6FF' },
  light_pace: { color: '#7C3AED', tint: '#F5F3FF' },
};

const PRODUCTIVITY_ORDER: ProductivityKey[] = [
  'restore',
  'deep_focus',
  'peak_social',
  'steady_flow',
  'light_pace',
];

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

const diffDaysIso = (fromIso: string, toIso: string): number => {
  const a = parseIsoDate(fromIso);
  const b = parseIsoDate(toIso);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

interface CalendarCell {
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

interface DayInsight {
  cycleDay: number;
  phase: CyclePhaseEnum;
  productivity: ProductivityKey;
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

function computeDayInsight(
  iso: string,
  anchorStartIso: string,
  cycleLength: number,
  isPeriod: boolean,
  isPredicted: boolean,
  isOvulation: boolean,
): DayInsight {
  const safeLen = Math.max(21, Math.min(40, cycleLength));
  const delta = diffDaysIso(anchorStartIso, iso);
  const cycleDay = (((delta % safeLen) + safeLen) % safeLen) + 1;

  const ovuStart = Math.max(9, safeLen - 15);
  const ovuEnd = Math.max(ovuStart + 2, safeLen - 11);
  const lateLutealStart = Math.max(ovuEnd + 2, safeLen - 4);

  if (isPeriod || isPredicted || cycleDay <= 5) {
    return { cycleDay, phase: 'menstrual', productivity: 'restore' };
  }
  if (isOvulation || (cycleDay >= ovuStart && cycleDay <= ovuEnd)) {
    return { cycleDay, phase: 'ovulation', productivity: 'peak_social' };
  }
  if (cycleDay < ovuStart) {
    return { cycleDay, phase: 'follicular', productivity: 'deep_focus' };
  }
  if (cycleDay >= lateLutealStart) {
    return { cycleDay, phase: 'luteal', productivity: 'light_pace' };
  }
  return { cycleDay, phase: 'luteal', productivity: 'steady_flow' };
}

interface AdaptiveCycleCalendarProps {
  cycleStatus: CycleStatusResponse;
  legendOpen: boolean;
  onCloseLegend: () => void;
  editPeriodOpen: boolean;
  onCloseEditPeriod: () => void;
}

export function AdaptiveCycleCalendar({
  cycleStatus,
  legendOpen,
  onCloseLegend,
  editPeriodOpen,
  onCloseEditPeriod,
}: AdaptiveCycleCalendarProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIsoDate(today), [today]);

  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [selectedIso, setSelectedIso] = useState<string>(todayIso);
  const [pickedDate, setPickedDate] = useState(today);

  useEffect(() => {
    if (editPeriodOpen) {
      setPickedDate(
        selectedIso <= todayIso ? parseIsoDate(selectedIso) : today,
      );
    }
  }, [editPeriodOpen, selectedIso, todayIso, today]);

  const logPeriodMutation = useMutation({
    mutationFn: (startDate: string) =>
      cycleApi.logPeriodStart({ start_date: startDate }),
    onSuccess: async () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ['cycleStatus'] });
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      onCloseEditPeriod();
    },
  });

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

  const {
    loggedDays,
    predictedDays,
    predictedCenter,
    ovulationDays,
    anchorStartIso,
  } = useMemo(() => {
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

    const latestStart =
      logs.length > 0
        ? logs[0].start_date
        : addDaysIso(todayIso, -(cycleStatus.day_of_cycle - 1));

    const ovulation = new Set<string>();
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
      anchorStartIso: latestStart,
    };
  }, [cycleStatus, roundedTotal, todayIso]);

  const shiftMonth = (delta: number): void => {
    void Haptics.selectionAsync();
    const next = new Date(displayYear, displayMonth + delta, 1);
    setDisplayYear(next.getFullYear());
    setDisplayMonth(next.getMonth());
  };

  return (
    <View style={styles.card}>
      {/* Month Switcher Header */}
      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>{monthTitle}</Text>
        <View style={styles.monthNav}>
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
            onPress={() => shiftMonth(-1)}
            hitSlop={8}
          >
            <ChevronLeft size={18} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
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

      {/* Interactive Calendar Days Grid (All Days Clickable) */}
      <View style={styles.daysGrid}>
        {cells.map((cell) => {
          const isPeriod = loggedDays.has(cell.iso);
          const isPredicted = predictedDays.has(cell.iso);
          const isOvulation = ovulationDays.has(cell.iso);
          const isToday = cell.iso === todayIso;
          const isSelected = cell.iso === selectedIso;
          const isCenter = cell.iso === predictedCenter;

          const dayInsight = computeDayInsight(
            cell.iso,
            anchorStartIso,
            roundedTotal,
            isPeriod,
            isPredicted,
            isOvulation,
          );
          const prodColor = PRODUCTIVITY_META[dayInsight.productivity].color;

          let bgColor = 'transparent';
          let textColor: string = cell.inCurrentMonth
            ? colors.textPrimary
            : colors.textMuted;
          let borderColor = 'transparent';

          if (isPeriod) {
            bgColor = '#FAD4E4';
            textColor = '#9D174D';
            borderColor = '#F472B6';
          } else if (isPredicted) {
            bgColor = '#FDF2F8';
            textColor = '#BE185D';
            borderColor = '#F472B6';
          } else if (isOvulation) {
            bgColor = '#DCFCE7';
            textColor = '#166534';
          }

          if (isToday && !isPeriod) {
            borderColor = colors.textSecondary;
          }
          if (isSelected) {
            borderColor = colors.textPrimary;
          }

          return (
            <View key={cell.iso} style={styles.daySlot}>
              <Pressable
                style={({ pressed }) => [
                  styles.dayCell,
                  { backgroundColor: bgColor, borderColor },
                  isPredicted && !isSelected && styles.predictedCell,
                  isToday && !isPeriod && styles.todayCell,
                  isSelected && styles.selectedCell,
                  !cell.inCurrentMonth && !isPeriod && styles.outsideMonth,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelectedIso(cell.iso);
                }}
              >
                <View style={styles.dayTopRow}>
                  <Text
                    style={[
                      styles.dayText,
                      { color: textColor },
                      (isPeriod || isToday || isSelected) && styles.dayTextBold,
                    ]}
                  >
                    {cell.dayNumber}
                  </Text>
                  {isCenter && !isPeriod && (
                    <View style={styles.centerDot} />
                  )}
                </View>

                <View
                  style={[styles.productivityBar, { backgroundColor: prodColor }]}
                />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Edit Period Start Modal */}
      <Modal
        visible={editPeriodOpen}
        transparent
        animationType="fade"
        onRequestClose={onCloseEditPeriod}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('cycle.logPeriodStart')}</Text>
              <Pressable onPress={onCloseEditPeriod} hitSlop={8}>
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

      {/* Question-Mark Legend Modal */}
      <Modal
        visible={legendOpen}
        transparent
        animationType="fade"
        onRequestClose={onCloseLegend}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.legendModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('cycle.legendTitle')}</Text>
              <Pressable onPress={onCloseLegend} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.legendModalScroll}
            >
              <Text style={styles.legendSectionTitle}>
                {t('cycle.legendCycleSection')}
              </Text>

              <View style={styles.legendList}>
                <View style={styles.legendModalRow}>
                  <View
                    style={[
                      styles.legendTile,
                      {
                        backgroundColor: '#FAD4E4',
                        borderWidth: 1.5,
                        borderColor: '#F472B6',
                      },
                    ]}
                  />
                  <View style={styles.legendTextCol}>
                    <Text style={styles.legendRowTitle}>
                      {t('cycle.legendPeriod')}
                    </Text>
                    <Text style={styles.legendRowDesc}>
                      {t('cycle.legendPeriodDesc')}
                    </Text>
                  </View>
                </View>

                <View style={styles.legendModalRow}>
                  <View
                    style={[
                      styles.legendTile,
                      {
                        backgroundColor: '#FDF2F8',
                        borderWidth: 1.5,
                        borderColor: '#F472B6',
                        borderStyle: 'dashed',
                      },
                    ]}
                  />
                  <View style={styles.legendTextCol}>
                    <Text style={styles.legendRowTitle}>
                      {t('cycle.legendPredicted')}
                    </Text>
                    <Text style={styles.legendRowDesc}>
                      {t('cycle.legendPredictedDesc')}
                    </Text>
                  </View>
                </View>

                <View style={styles.legendModalRow}>
                  <View
                    style={[styles.legendTile, { backgroundColor: '#DCFCE7' }]}
                  />
                  <View style={styles.legendTextCol}>
                    <Text style={styles.legendRowTitle}>
                      {t('cycle.legendOvulation')}
                    </Text>
                    <Text style={styles.legendRowDesc}>
                      {t('cycle.legendOvulationDesc')}
                    </Text>
                  </View>
                </View>

                <View style={styles.legendModalRow}>
                  <View
                    style={[
                      styles.legendTile,
                      {
                        backgroundColor: colors.white,
                        borderWidth: 1.5,
                        borderColor: colors.textSecondary,
                      },
                    ]}
                  />
                  <View style={styles.legendTextCol}>
                    <Text style={styles.legendRowTitle}>
                      {t('cycle.legendToday')}
                    </Text>
                    <Text style={styles.legendRowDesc}>
                      {t('cycle.legendTodayDesc')}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.legendSectionTitle}>
                {t('cycle.legendProductivitySection')}
              </Text>

              <View style={styles.legendList}>
                {PRODUCTIVITY_ORDER.map((key) => (
                  <View key={key} style={styles.legendModalRow}>
                    <View style={styles.legendBarBadge}>
                      <View
                        style={[
                          styles.legendBarPreview,
                          { backgroundColor: PRODUCTIVITY_META[key].color },
                        ]}
                      />
                    </View>
                    <View style={styles.legendTextCol}>
                      <Text style={styles.legendRowTitle}>
                        {t(`cycle.productivity.${key}.title`)}
                      </Text>
                      <Text style={styles.legendRowDesc}>
                        {t(`cycle.productivity.${key}.tip`)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingVertical: 3,
    gap: 3,
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
    opacity: 0.42,
  },
  dayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dayText: {
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  dayTextBold: {
    fontWeight: '800',
  },
  centerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DB2777',
  },
  productivityBar: {
    width: 16,
    height: 3.5,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
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
  legendModalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: spacing.lg,
    gap: 12,
    maxHeight: '80%',
  },
  legendModalScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  legendSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  legendList: {
    gap: 10,
  },
  legendModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendTile: {
    width: 24,
    height: 24,
    borderRadius: 8,
  },
  legendBarBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#F3F1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendBarPreview: {
    width: 16,
    height: 4,
    borderRadius: 2,
  },
  legendTextCol: {
    flex: 1,
    gap: 1,
  },
  legendRowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  legendRowDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
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
