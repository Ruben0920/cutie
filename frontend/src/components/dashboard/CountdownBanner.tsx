import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Edit3 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { coupleApi } from '@/api/endpoints';
import { colors, radii, spacing } from '@/theme/colors';
import type { CoupleDashboard } from '@/types/api';

interface CountdownBannerProps {
  dashboard: CoupleDashboard;
}

interface RemainingParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function computeRemaining(targetIso: string): RemainingParts {
  const targetMs = new Date(targetIso).getTime();
  const diffSec = Math.floor((targetMs - Date.now()) / 1000);
  if (diffSec <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;
  return { days, hours, minutes, seconds, isPast: false };
}

export function CountdownBanner({
  dashboard,
}: CountdownBannerProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const targetDatetime = dashboard.next_meeting_datetime;
  const [remaining, setRemaining] = useState<RemainingParts | null>(() =>
    targetDatetime ? computeRemaining(targetDatetime) : null,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() =>
    targetDatetime ? new Date(targetDatetime) : new Date(),
  );

  useEffect(() => {
    if (!targetDatetime) {
      setRemaining(null);
      return;
    }
    setRemaining(computeRemaining(targetDatetime));
    const timer = setInterval(() => {
      setRemaining(computeRemaining(targetDatetime));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDatetime]);

  const updateMutation = useMutation({
    mutationFn: coupleApi.updateRelationshipProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      setEditOpen(false);
    },
  });

  if (!targetDatetime || !remaining) {
    return null;
  }

  const handlePickerChange = (
    _event: DateTimePickerEvent,
    selected?: Date,
  ): void => {
    if (selected) setDraftDate(selected);
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Calendar size={16} color={colors.secondary} />
            <Text style={styles.title}>{t('home.countdownTitle')}</Text>
          </View>
          <Pressable
            onPress={() => {
              setDraftDate(new Date(targetDatetime));
              setEditOpen(true);
            }}
            style={styles.editBtn}
          >
            <Edit3 size={15} color={colors.secondary} />
          </Pressable>
        </View>

        {remaining.isPast ? (
          <Text style={styles.arrivedText}>{t('home.meetingArrived')}</Text>
        ) : (
          <View style={styles.timerRow}>
            <View style={styles.unitBox}>
              <Text style={styles.unitValue}>
                {String(remaining.days).padStart(2, '0')}
              </Text>
              <Text style={styles.unitLabel}>{t('home.days')}</Text>
            </View>
            <View style={styles.unitBox}>
              <Text style={styles.unitValue}>
                {String(remaining.hours).padStart(2, '0')}
              </Text>
              <Text style={styles.unitLabel}>{t('home.hours')}</Text>
            </View>
            <View style={styles.unitBox}>
              <Text style={styles.unitValue}>
                {String(remaining.minutes).padStart(2, '0')}
              </Text>
              <Text style={styles.unitLabel}>{t('home.minutes')}</Text>
            </View>
            <View style={styles.unitBox}>
              <Text style={styles.unitValue}>
                {String(remaining.seconds).padStart(2, '0')}
              </Text>
              <Text style={styles.unitLabel}>{t('home.seconds')}</Text>
            </View>
          </View>
        )}
      </View>

      <Modal visible={editOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t('onboarding.nextMeetingLabel')}
            </Text>
            <DateTimePicker
              value={draftDate}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handlePickerChange}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setEditOpen(false)}
              >
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={styles.saveBtn}
                onPress={() => {
                  updateMutation.mutate({
                    relationship_format: dashboard.relationship_format,
                    onboarding_quiz_data: dashboard.onboarding_quiz_data ?? {},
                    next_meeting_datetime: draftDate.toISOString(),
                  });
                }}
              >
                <Text style={styles.saveText}>{t('common.save')}</Text>
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
    backgroundColor: colors.secondarySoft,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
  },
  editBtn: {
    padding: spacing.xs,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  unitBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  unitValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.secondary,
  },
  unitLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  arrivedText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    fontWeight: '700',
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
    backgroundColor: colors.secondary,
    alignItems: 'center',
  },
  saveText: {
    color: colors.white,
    fontWeight: '700',
  },
});
