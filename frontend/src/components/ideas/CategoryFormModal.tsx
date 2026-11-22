import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { datesApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { categoryColors, colors, radii, spacing } from '@/theme/colors';
import type { DateCategoryEnum, EnergyLevelEnum } from '@/types/api';

const BASE_CATEGORIES: DateCategoryEnum[] = [
  'romantic',
  'home',
  'food',
  'relax',
  'active',
  'extreme',
];

const ENERGIES: EnergyLevelEnum[] = ['low', 'medium', 'high'];

interface CategoryFormModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CategoryFormModal({
  visible,
  onClose,
}: CategoryFormModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [baseCategory, setBaseCategory] =
    useState<DateCategoryEnum>('romantic');
  const [firstIdeaTitle, setFirstIdeaTitle] = useState('');
  const [firstIdeaDesc, setFirstIdeaDesc] = useState('');
  const [firstIdeaEnergy, setFirstIdeaEnergy] =
    useState<EnergyLevelEnum>('medium');
  const [firstIdeaSurprise, setFirstIdeaSurprise] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = (): void => {
    setName('');
    setBaseCategory('romantic');
    setFirstIdeaTitle('');
    setFirstIdeaDesc('');
    setFirstIdeaEnergy('medium');
    setFirstIdeaSurprise(false);
    setErrorMsg(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const createdCategory = await datesApi.createCategory({
        name: name.trim(),
        base_category: baseCategory,
        color_hex: categoryColors[baseCategory],
      });

      if (firstIdeaTitle.trim()) {
        await datesApi.create({
          title: firstIdeaTitle.trim(),
          description: firstIdeaDesc.trim() || null,
          category: baseCategory,
          custom_category_id: createdCategory.id,
          required_energy: firstIdeaEnergy,
          is_surprise: firstIdeaSurprise,
          suitable_for_long_distance: false,
        });
      }
      return createdCategory;
    },
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customCategories'] }),
        queryClient.invalidateQueries({ queryKey: ['dateIdeas'] }),
      ]);
      resetForm();
      onClose();
    },
    onError: (err: unknown) => {
      setErrorMsg(extractErrorMessage(err, t('common.error')));
    },
  });

  const handleSubmit = (): void => {
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg('Please enter a category name.');
      return;
    }
    createMutation.mutate();
  };

  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropDismiss} onPress={handleClose} />
        <View style={styles.sheetCard}>
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('ideas.createCategory')}</Text>
            <Pressable
              style={styles.closeBtn}
              onPress={handleClose}
              hitSlop={12}
            >
              <X size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.sheet}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('ideas.categoryNamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>
            {t('ideas.categoryThemeLabel')}
          </Text>
          <View style={styles.chipWrap}>
            {BASE_CATEGORIES.map((cat) => {
              const active = baseCategory === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setBaseCategory(cat)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {t(`categories.${cat}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.optionalBox}>
            <Text style={styles.optionalHeader}>
              {t('ideas.optionalFirstIdea')}
            </Text>

            <TextInput
              value={firstIdeaTitle}
              onChangeText={setFirstIdeaTitle}
              placeholder={t('ideas.firstIdeaTitlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={styles.inputWhite}
            />

            {firstIdeaTitle.trim().length > 0 ? (
              <>
                <TextInput
                  value={firstIdeaDesc}
                  onChangeText={setFirstIdeaDesc}
                  placeholder={t('ideas.firstIdeaDescPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[styles.inputWhite, styles.multiline]}
                />

                <View style={styles.chipWrap}>
                  {ENERGIES.map((lvl) => (
                    <Pressable
                      key={lvl}
                      style={[
                        styles.chipWhite,
                        firstIdeaEnergy === lvl && styles.chipActive,
                      ]}
                      onPress={() => setFirstIdeaEnergy(lvl)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          firstIdeaEnergy === lvl && styles.chipTextActive,
                        ]}
                      >
                        {t(`energy.${lvl}`)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Secret Surprise</Text>
                  <Switch
                    value={firstIdeaSurprise}
                    onValueChange={setFirstIdeaSurprise}
                  />
                </View>
              </>
            ) : null}
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
        </ScrollView>
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
  sheetCard: {
    maxHeight: '78%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
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
    marginBottom: 8,
  },
  scroll: {
    flexGrow: 0,
  },
  sheet: {
    paddingHorizontal: spacing.xl,
    paddingTop: 6,
    paddingBottom: 36,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 8,
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
  inputWhite: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.textPrimary,
  },
  multiline: {
    minHeight: 62,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipWhite: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  optionalBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  optionalHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
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
