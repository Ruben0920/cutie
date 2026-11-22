import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <ScrollView
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('ideas.createCategory')}</Text>
            <Pressable
              onPress={() => {
                resetForm();
                onClose();
              }}
            >
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

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
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
