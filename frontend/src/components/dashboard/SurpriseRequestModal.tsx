import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ArrowUpRight, Gift } from 'lucide-react-native';
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

import { interactionsApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { BottomSheetModal } from '@/components/common/BottomSheetModal';
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
        style={({ pressed }) => [styles.actionCube, pressed && styles.pressed]}
        onPress={() => {
          void Haptics.selectionAsync();
          setFeedback(null);
          setOpen(true);
        }}
      >
        <View style={styles.cubeTopRow}>
          <View style={styles.iconBubble}>
            <Gift size={22} color={colors.primary} strokeWidth={1.85} />
          </View>
          <ArrowUpRight size={17} color="rgba(225,29,72,0.5)" strokeWidth={2} />
        </View>
        <View style={styles.tileMeta}>
          <Text style={styles.tileTitle} numberOfLines={2}>
            {t('home.requestSurpriseCta')}
          </Text>
          <Text style={styles.tileSubtitle} numberOfLines={2}>
            {t('home.requestSurpriseSubtitle')}
          </Text>
        </View>
      </Pressable>

      <BottomSheetModal
        visible={open}
        title={t('home.requestSurpriseCta')}
        onClose={() => setOpen(false)}
      >
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
            <Text style={styles.sendText}>{t('home.sendSurpriseRequest')}</Text>
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
    justifyContent: 'space-between',
    backgroundColor: '#FCEEF3',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(225,29,72,0.08)',
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
