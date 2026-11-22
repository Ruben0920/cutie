import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ArrowUpRight, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { datesApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { BottomSheetModal } from '@/components/common/BottomSheetModal';
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
        <ArrowUpRight
          size={16}
          color="rgba(124,58,237,0.55)"
          strokeWidth={2}
          style={styles.cornerArrow}
        />
        <View style={styles.iconBubble}>
          <Sparkles size={22} color={colors.secondary} strokeWidth={1.85} />
        </View>
        <View style={styles.tileMeta}>
          <Text
            style={styles.tileTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {t('home.eveningWishCta')}
          </Text>
          <Text style={styles.tileSubtitle} numberOfLines={2}>
            {t('home.eveningWishSubtitle')}
          </Text>
        </View>
      </Pressable>

      <BottomSheetModal
        visible={open}
        title={t('home.eveningWishCta')}
        onClose={() => setOpen(false)}
      >
        <TextInput
          value={wishText}
          onChangeText={setWishText}
          placeholder={t('home.eveningWishPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.input}
        />

        {feedback ? (
          <Text style={[styles.feedback, isError && styles.feedbackError]}>
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
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  actionCube: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3EEFC',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.08)',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  cornerArrow: {
    position: 'absolute',
    top: 14,
    right: 14,
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
    width: '100%',
    alignItems: 'center',
    gap: 4,
    minHeight: 56,
  },
  tileTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 20,
    textAlign: 'center',
  },
  tileSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 16,
    textAlign: 'center',
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
