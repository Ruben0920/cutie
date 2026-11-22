import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Gift, X } from 'lucide-react-native';
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
        style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}
        onPress={() => {
          setFeedback(null);
          setOpen(true);
        }}
      >
        <View style={styles.iconBubble}>
          <Gift size={20} color={colors.primary} strokeWidth={1.8} />
        </View>
        <View style={styles.tileMeta}>
          <Text style={styles.tileTitle}>{t('home.requestSurpriseCta')}</Text>
          <Text style={styles.tileSubtitle} numberOfLines={1}>
            {t('home.requestSurpriseSubtitle')}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
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
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FCEEF3',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.88,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileMeta: {
    flex: 1,
    gap: 2,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tileSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
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
    borderRadius: radii.lg,
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
