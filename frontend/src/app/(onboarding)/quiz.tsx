import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { coupleApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { colors, radii, spacing } from '@/theme/colors';
import type { LoveLanguageEnum, RelationshipFormatEnum } from '@/types/api';

const FORMATS: RelationshipFormatEnum[] = [
  'living_together',
  'dating_separate',
  'long_distance',
];

const VIBE_OPTIONS = ['Cozy & Home', 'Food & Wine', 'Active Adventure', 'Spontaneous'];
const SURPRISE_STYLES = ['Small Thoughtful Gifts', 'Secret Dates', 'Handwritten Notes'];
const LOVE_LANGUAGES: LoveLanguageEnum[] = [
  'quality_time',
  'physical_touch',
  'words_of_affirmation',
  'acts_of_service',
  'receiving_gifts',
];

export default function QuizScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [format, setFormat] = useState<RelationshipFormatEnum>('dating_separate');
  const [nextMeeting, setNextMeeting] = useState<Date>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [weeknightVibe, setWeeknightVibe] = useState(VIBE_OPTIONS[0]);
  const [surpriseStyle, setSurpriseStyle] = useState(SURPRISE_STYLES[0]);
  const [loveLanguage, setLoveLanguage] =
    useState<LoveLanguageEnum>('quality_time');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const needsMeetingDate =
    format === 'long_distance' || format === 'dating_separate';

  const saveMutation = useMutation({
    mutationFn: coupleApi.updateRelationshipProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      router.replace('/(tabs)/home');
    },
    onError: (err: unknown) => {
      setErrorMsg(extractErrorMessage(err, t('common.error')));
    },
  });

  const handleDateChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ): void => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setNextMeeting(selectedDate);
    }
  };

  const handleSubmit = (): void => {
    setErrorMsg(null);
    saveMutation.mutate({
      relationship_format: format,
      next_meeting_datetime: needsMeetingDate ? nextMeeting.toISOString() : null,
      onboarding_quiz_data: {
        weeknight_vibe: weeknightVibe,
        surprise_style: surpriseStyle,
        primary_love_language: loveLanguage,
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('onboarding.quizTitle')}</Text>

      <View style={styles.card}>
        {FORMATS.map((item) => {
          const active = format === item;
          return (
            <Pressable
              key={item}
              style={[styles.optionCard, active && styles.optionActive]}
              onPress={() => setFormat(item)}
            >
              <Text
                style={[
                  styles.optionText,
                  active && styles.optionTextActive,
                ]}
              >
                {t(`onboarding.formats.${item}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {needsMeetingDate ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            {t('onboarding.nextMeetingLabel')}
          </Text>
          {Platform.OS === 'android' ? (
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {nextMeeting.toLocaleString()}
              </Text>
            </Pressable>
          ) : null}
          {showDatePicker ? (
            <DateTimePicker
              value={nextMeeting}
              mode="datetime"
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('onboarding.quizQ1')}</Text>
        <View style={styles.chipWrap}>
          {VIBE_OPTIONS.map((v) => (
            <Pressable
              key={v}
              style={[styles.chip, weeknightVibe === v && styles.chipActive]}
              onPress={() => setWeeknightVibe(v)}
            >
              <Text
                style={[
                  styles.chipText,
                  weeknightVibe === v && styles.chipTextActive,
                ]}
              >
                {v}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t('onboarding.quizQ2')}</Text>
        <View style={styles.chipWrap}>
          {SURPRISE_STYLES.map((s) => (
            <Pressable
              key={s}
              style={[styles.chip, surpriseStyle === s && styles.chipActive]}
              onPress={() => setSurpriseStyle(s)}
            >
              <Text
                style={[
                  styles.chipText,
                  surpriseStyle === s && styles.chipTextActive,
                ]}
              >
                {s}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t('onboarding.quizQ3')}</Text>
        <View style={styles.chipWrap}>
          {LOVE_LANGUAGES.map((ll) => (
            <Pressable
              key={ll}
              style={[styles.chip, loveLanguage === ll && styles.chipActive]}
              onPress={() => setLoveLanguage(ll)}
            >
              <Text
                style={[
                  styles.chipText,
                  loveLanguage === ll && styles.chipTextActive,
                ]}
              >
                {t(`loveLanguages.${ll}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <Pressable
        style={[
          styles.primaryButton,
          saveMutation.isPending && styles.disabledButton,
        ]}
        onPress={handleSubmit}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.primaryButtonText}>
            {t('onboarding.finishQuiz')}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    paddingTop: 56,
    gap: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  optionCard: {
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateButton: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
  },
  dateButtonText: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipActive: {
    backgroundColor: colors.secondarySoft,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.secondary,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
