import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { HeartHandshake, LogOut, QrCode, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { authApi, coupleApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { LanguagePill } from '@/components/common/LanguagePill';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavStore } from '@/store/useNavStore';
import { colors, radii, spacing } from '@/theme/colors';
import type { GenderRoleEnum, RelationshipFormatEnum } from '@/types/api';

const GENDER_ROLES: GenderRoleEnum[] = ['female', 'male', 'partner'];
const FORMATS: RelationshipFormatEnum[] = [
  'living_together',
  'dating_separate',
  'long_distance',
];

export default function ProfileScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const currentUser = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);

  const dashboardQuery = useQuery({
    queryKey: ['coupleDashboard'],
    queryFn: coupleApi.getDashboard,
  });

  const [name, setName] = useState(currentUser?.name ?? '');
  const [genderRole, setGenderRole] = useState<GenderRoleEnum>(
    currentUser?.gender_role ?? 'female',
  );
  const [relFormat, setRelFormat] = useState<RelationshipFormatEnum>(
    dashboardQuery.data?.relationship_format ?? 'dating_separate',
  );
  const [nextMeeting, setNextMeeting] = useState<Date | null>(
    dashboardQuery.data?.next_meeting_datetime
      ? new Date(dashboardQuery.data.next_meeting_datetime)
      : null,
  );
  const [showPicker, setShowPicker] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setGenderRole(currentUser.gender_role);
    }
  }, [currentUser]);

  useEffect(() => {
    if (dashboardQuery.data) {
      setRelFormat(dashboardQuery.data.relationship_format);
      setNextMeeting(
        dashboardQuery.data.next_meeting_datetime
          ? new Date(dashboardQuery.data.next_meeting_datetime)
          : null,
      );
    }
  }, [dashboardQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updatePreferences,
    onSuccess: async (updated) => {
      await updateUser(updated);
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      setFeedback('Profile updated!');
      setTimeout(() => setFeedback(null), 2000);
    },
    onError: (err: unknown) => {
      setFeedback(extractErrorMessage(err, t('common.error')));
    },
  });

  const updateCoupleMutation = useMutation({
    mutationFn: coupleApi.updateRelationshipProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      setFeedback('Couple settings saved!');
      setTimeout(() => setFeedback(null), 2000);
    },
    onError: (err: unknown) => {
      setFeedback(extractErrorMessage(err, t('common.error')));
    },
  });

  const handleLogout = async (): Promise<void> => {
    queryClient.clear();
    useNavStore.getState().resetNav();
    await logout();
    router.replace('/(auth)/login');
  };

  const handleDateChange = (
    _event: DateTimePickerEvent,
    selected?: Date,
  ): void => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selected) {
      setNextMeeting(selected);
    }
  };

  if (dashboardQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const dashboard = dashboardQuery.data;
  const partner = dashboard?.partners.find((p) => p.id !== currentUser?.id);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
        <LanguagePill />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('auth.name')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.sectionTitle}>{t('auth.genderRole')}</Text>
        <View style={styles.chipRow}>
          {GENDER_ROLES.map((role) => {
            const active = genderRole === role;
            return (
              <Pressable
                key={role}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setGenderRole(role)}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {t(`auth.roles.${role}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={styles.saveBtn}
          onPress={() =>
            updateProfileMutation.mutate({
              name: name.trim(),
              gender_role: genderRole,
            })
          }
          disabled={updateProfileMutation.isPending}
        >
          <Text style={styles.saveText}>{t('common.save')}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('profile.coupleSection')}</Text>

        {partner ? (
          <View style={styles.pairedBadge}>
            <HeartHandshake size={18} color={colors.success} />
            <Text style={styles.pairedText}>
              {t('profile.pairedWith', { name: partner.name })}
            </Text>
          </View>
        ) : (
          <Pressable
            style={styles.pairBtn}
            onPress={() => router.push('/(onboarding)/pair')}
          >
            <QrCode size={16} color={colors.primaryDark} />
            <Text style={styles.pairBtnText}>{t('profile.notPaired')}</Text>
          </Pressable>
        )}

        <View style={styles.formatList}>
          {FORMATS.map((fmt) => {
            const active = relFormat === fmt;
            return (
              <Pressable
                key={fmt}
                style={[styles.formatCard, active && styles.formatActive]}
                onPress={() => setRelFormat(fmt)}
              >
                <Text
                  style={[styles.formatText, active && styles.formatTextActive]}
                >
                  {t(`onboarding.formats.${fmt}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.meetingRow}>
          <Pressable
            style={styles.dateTrigger}
            onPress={() => setShowPicker((prev) => !prev)}
          >
            <Text style={styles.dateTriggerText}>
              {nextMeeting
                ? nextMeeting.toLocaleString()
                : t('onboarding.nextMeetingLabel')}
            </Text>
          </Pressable>
          {nextMeeting ? (
            <Pressable
              style={styles.clearDateBtn}
              onPress={() => setNextMeeting(null)}
            >
              <Text style={styles.clearDateText}>{t('home.clearScenario')}</Text>
            </Pressable>
          ) : null}
        </View>

        {showPicker ? (
          <DateTimePicker
            value={nextMeeting ?? new Date()}
            mode="datetime"
            onChange={handleDateChange}
          />
        ) : null}

        <Pressable
          style={styles.saveBtn}
          onPress={() =>
            updateCoupleMutation.mutate({
              relationship_format: relFormat,
              onboarding_quiz_data: dashboard?.onboarding_quiz_data ?? {},
              next_meeting_datetime: nextMeeting
                ? nextMeeting.toISOString()
                : null,
            })
          }
          disabled={updateCoupleMutation.isPending}
        >
          <Text style={styles.saveText}>{t('common.save')}</Text>
        </Pressable>

        <Pressable
          style={styles.quizBtn}
          onPress={() => router.push('/(onboarding)/quiz')}
        >
          <RefreshCw size={15} color={colors.secondary} />
          <Text style={styles.quizText}>{t('profile.retakeQuiz')}</Text>
        </Pressable>
      </View>

      {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}

      <Pressable
        style={styles.logoutBtn}
        onPress={() => {
          void handleLogout();
        }}
      >
        <LogOut size={18} color={colors.danger} />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: 58,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  title: {
    fontSize: 26,
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  pairedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  pairedText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 14,
  },
  pairBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  pairBtnText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  formatList: {
    gap: spacing.xs,
  },
  formatCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  formatActive: {
    backgroundColor: colors.secondarySoft,
  },
  formatText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  formatTextActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
  meetingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  dateTrigger: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  dateTriggerText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
  clearDateBtn: {
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  clearDateText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  quizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondarySoft,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  quizText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 14,
  },
  feedbackText: {
    textAlign: 'center',
    color: colors.success,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.lg,
  },
  logoutText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 15,
  },
});
