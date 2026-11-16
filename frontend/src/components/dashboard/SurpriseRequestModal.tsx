import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Gift, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { interactionsApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { colors, radii, spacing } from '@/theme/colors';

export function SurpriseRequestModal(): React.JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const surpriseMutation = useMutation({
    mutationFn: interactionsApi.requestSurprise,
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFeedback(t('home.surpriseSent'));
      setHint('');
      setTimeout(() => {
        setFeedback(null);
        setOpen(false);
      }, 1500);
    },
    onError: (err: unknown) => {
      setFeedback(extractErrorMessage(err, t('common.error')));
    },
  });

  return (
    <>
      <Pressable
        style={styles.ctaButton}
        onPress={() => {
          setFeedback(null);
          setOpen(true);
        }}
      >
        <Gift size={20} color={colors.white} />
        <Text style={styles.ctaText}>{t('home.requestSurpriseCta')}</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {t('home.requestSurpriseCta')}
              </Text>
              <Pressable onPress={() => setOpen(false)}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <TextInput
              value={hint}
              onChangeText={setHint}
              placeholder={t('home.surpriseHintPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.input}
            />

            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

            <Pressable
              style={[
                styles.sendButton,
                surpriseMutation.isPending && styles.disabled,
              ]}
              onPress={() => {
                surpriseMutation.mutate(hint.trim() || undefined);
              }}
              disabled={surpriseMutation.isPending}
            >
              {surpriseMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.sendText}>
                  {t('home.sendSurpriseRequest')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    paddingBottom: 36,
    gap: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 84,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.textPrimary,
  },
  feedback: {
    color: colors.success,
    fontWeight: '700',
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  sendText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
