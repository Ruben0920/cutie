import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { giftsApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { colors, radii, spacing } from '@/theme/colors';

interface GiftFormModalProps {
  visible: boolean;
  onClose: () => void;
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function GiftFormModal({
  visible,
  onClose,
}: GiftFormModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [priceText, setPriceText] = useState('');
  const [priority, setPriority] = useState(3);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: giftsApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['giftIdeas'] });
      setTitle('');
      setDirectUrl('');
      setPriceText('');
      setPriority(3);
      setErrorMsg(null);
      onClose();
    },
    onError: (err: unknown) => {
      setErrorMsg(extractErrorMessage(err, t('common.error')));
    },
  });

  const handleSubmit = (): void => {
    setErrorMsg(null);
    const normalizedUrl = normalizeUrl(directUrl);
    if (!title.trim() || !normalizedUrl) {
      setErrorMsg('Please enter a gift title and link.');
      return;
    }

    const parsedPrice = priceText.trim()
      ? Number(priceText.replace(',', '.'))
      : null;
    if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      setErrorMsg('Invalid price value.');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      direct_url: normalizedUrl,
      price_estimate: parsedPrice,
      priority,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('ideas.addGift')}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <X size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Gift name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <TextInput
            value={directUrl}
            onChangeText={setDirectUrl}
            placeholder="https://..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
            style={styles.input}
          />

          <TextInput
            value={priceText}
            onChangeText={setPriceText}
            placeholder="Estimated price (optional)"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <View style={styles.priorityRow}>
            <Text style={styles.priorityLabel}>Priority:</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setPriority(star)}
                  style={[
                    styles.starChip,
                    priority >= star && styles.starChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.starText,
                      priority >= star && styles.starTextActive,
                    ]}
                  >
                    ★ {star}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <Pressable
            style={[
              styles.submitBtn,
              createMutation.isPending && styles.disabled,
            ]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>{t('common.save')}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,15,24,0.48)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    paddingBottom: 36,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.14)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  priorityRow: {
    gap: spacing.xs,
  },
  priorityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  starChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  starChipActive: {
    backgroundColor: colors.accentGoldSoft,
  },
  starText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  starTextActive: {
    color: colors.accentGold,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
