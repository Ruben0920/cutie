import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ArrowUpRight, Sparkles, X } from 'lucide-react-native';
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

import { datesApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { colors, radii, spacing } from '@/theme/colors';

export function EveningWishModal(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [wishText, setWishText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const wishMutation = useMutation({
    mutationFn: datesApi.sendEveningWish,
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      setIsError(false);
      setFeedback(t('home.eveningWishSent'));
      setWishText('');
      setTimeout(() => {
        setFeedback(null);
        setOpen(false);
      }, 1300);
    },
    onError: (err: unknown) => {
      setIsError(true);
      setFeedback(extractErrorMessage(err, t('common.error')));
    },
  });

  const handleSubmit = (): void => {
    if (!wishText.trim()) {
      setIsError(true);
      setFeedback('Please enter your wish for tonight.');
      return;
    }
    setIsError(false);
    setFeedback(null);
    wishMutation.mutate({ wish_text: wishText.trim() });
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.actionCube, pressed && styles.pressed]}
        onPress={() => {
          void Haptics.selectionAsync();
          setFeedback(null);
          setIsError(false);
          setOpen(true);
        }}
      >
        <View style={styles.cubeTopRow}>
          <View style={styles.iconBubble}>
            <Sparkles size={22} color={colors.secondary} strokeWidth={1.85} />
          </View>
          <ArrowUpRight size={17} color="rgba(124,58,237,0.55)" strokeWidth={2} />
        </View>
        <View style={styles.tileMeta}>
          <Text style={styles.tileTitle} numberOfLines={2}>
            {t('home.eveningWishCta')}
          </Text>
          <Text style={styles.tileSubtitle} numberOfLines={2}>
            {t('home.eveningWishSubtitle')}
          </Text>
        </View>
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
              <Text style={styles.sheetTitle}>{t('home.eveningWishCta')}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <TextInput
              value={wishText}
              onChangeText={setWishText}
              placeholder={t('home.eveningWishPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.input}
            />

            {feedback ? (
              <Text
                style={[styles.feedback, isError && styles.feedbackError]}
              >
                {feedback}
              </Text>
            ) : null}

            <Pressable
              style={[
                styles.sendButton,
                wishMutation.isPending && styles.disabled,
              ]}
              onPress={handleSubmit}
              disabled={wishMutation.isPending}
            >
              {wishMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.sendText}>{t('home.sendEveningWish')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actionCube: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'space-between',
    backgroundColor: '#F3EEFC',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.08)',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  cubeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileMeta: {
    gap: 4,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  tileSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 16,
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
    minHeight: 88,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.textPrimary,
  },
  feedback: {
    color: colors.success,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackError: {
    color: colors.danger,
  },
  sendButton: {
    backgroundColor: colors.secondary,
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
