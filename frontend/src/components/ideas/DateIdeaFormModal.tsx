import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { datesApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { BottomSheetModal } from '@/components/common/BottomSheetModal';
import { colors, radii, spacing } from '@/theme/colors';
import type {
  CustomCategory,
  DateCategoryEnum,
  DateIdea,
  EnergyLevelEnum,
} from '@/types/api';

const CATEGORIES: DateCategoryEnum[] = [
  'romantic',
  'active',
  'relax',
  'food',
  'extreme',
  'home',
];

const ENERGIES: EnergyLevelEnum[] = ['low', 'medium', 'high'];

interface DateIdeaFormModalProps {
  visible: boolean;
  editingIdea: DateIdea | null;
  defaultCategory?: DateCategoryEnum;
  defaultCustomCategoryId?: string | null;
  defaultSurprise?: boolean;
  customCategories?: CustomCategory[];
  onClose: () => void;
}

export function DateIdeaFormModal({
  visible,
  editingIdea,
  defaultCategory = 'romantic',
  defaultCustomCategoryId = null,
  defaultSurprise = false,
  customCategories = [],
  onClose,
}: DateIdeaFormModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DateCategoryEnum>('romantic');
  const [customCategoryId, setCustomCategoryId] = useState<string | null>(null);
  const [energy, setEnergy] = useState<EnergyLevelEnum>('medium');
  const [isSurprise, setIsSurprise] = useState(false);
  const [longDistance, setLongDistance] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingIdea) {
      setTitle(editingIdea.title);
      setDescription(editingIdea.description ?? '');
      setCategory(editingIdea.category);
      setCustomCategoryId(editingIdea.custom_category_id ?? null);
      setEnergy(editingIdea.required_energy);
      setIsSurprise(editingIdea.is_surprise);
      setLongDistance(editingIdea.suitable_for_long_distance);
    } else {
      setTitle('');
      setDescription('');
      setCategory(defaultCategory);
      setCustomCategoryId(defaultCustomCategoryId);
      setEnergy('medium');
      setIsSurprise(defaultSurprise);
      setLongDistance(false);
    }
    setErrorMsg(null);
  }, [
    editingIdea,
    visible,
    defaultCategory,
    defaultCustomCategoryId,
    defaultSurprise,
  ]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingIdea) {
        return datesApi.update(editingIdea.id, {
          title: title.trim(),
          description: description.trim() || null,
          category,
          custom_category_id: customCategoryId,
          required_energy: energy,
          is_surprise: isSurprise,
          suitable_for_long_distance: longDistance,
        });
      }
      return datesApi.create({
        title: title.trim(),
        description: description.trim() || null,
        category,
        custom_category_id: customCategoryId,
        required_energy: energy,
        is_surprise: isSurprise,
        suitable_for_long_distance: longDistance,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dateIdeas'] });
      onClose();
    },
    onError: (err: unknown) => {
      setErrorMsg(extractErrorMessage(err, t('common.error')));
    },
  });

  const handleSubmit = (): void => {
    setErrorMsg(null);
    if (!title.trim()) {
      setErrorMsg('Please enter a title.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <BottomSheetModal
      visible={visible}
      title={t('ideas.createIdea')}
      onClose={onClose}
      scrollable
    >

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Idea title"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            style={[styles.input, styles.multiline]}
          />

          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.chipWrap}>
            {CATEGORIES.map((cat) => {
              const active = !customCategoryId && category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    setCustomCategoryId(null);
                    setCategory(cat);
                  }}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {t(`categories.${cat}`)}
                  </Text>
                </Pressable>
              );
            })}

            {customCategories.map((customCat) => {
              const active = customCategoryId === customCat.id;
              return (
                <Pressable
                  key={customCat.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    setCustomCategoryId(customCat.id);
                    setCategory(customCat.base_category);
                  }}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {customCat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Energy</Text>
          <View style={styles.chipWrap}>
            {ENERGIES.map((lvl) => (
              <Pressable
                key={lvl}
                style={[styles.chip, energy === lvl && styles.chipActive]}
                onPress={() => setEnergy(lvl)}
              >
                <Text
                  style={[
                    styles.chipText,
                    energy === lvl && styles.chipTextActive,
                  ]}
                >
                  {t(`energy.${lvl}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Secret Surprise</Text>
            <Switch value={isSurprise} onValueChange={setIsSurprise} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Long Distance Friendly</Text>
            <Switch value={longDistance} onValueChange={setLongDistance} />
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <Pressable
            style={[
              styles.submitBtn,
              saveMutation.isPending && styles.disabled,
            ]}
            onPress={handleSubmit}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitText}>{t('common.save')}</Text>
            )}
          </Pressable>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  multiline: {
    minHeight: 72,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 15,
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
