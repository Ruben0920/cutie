import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { cycleApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { colors, radii, spacing } from '@/theme/colors';
import type { CycleStatusResponse, LoveLanguageEnum } from '@/types/api';

const WELLBEING_PRESETS = [
  'Болит живот',
  'Отличное настроение',
  'Хочется на ручки',
  'Нужно больше покоя',
];

const FOOD_PRESETS = [
  'Темный шоколад',
  'Теплая еда',
  'Ягоды',
  'Травяной чай',
  'Что-то сытное',
];

const LOVE_LANGUAGES: LoveLanguageEnum[] = [
  'words_of_affirmation',
  'quality_time',
  'receiving_gifts',
  'acts_of_service',
  'physical_touch',
];

interface DailyObservationModalProps {
  visible: boolean;
  cycleStatus: CycleStatusResponse;
  onClose: () => void;
}

export function DailyObservationModal({
  visible,
  cycleStatus,
  onClose,
}: DailyObservationModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [wellbeing, setWellbeing] = useState(cycleStatus.wellbeing_summary);
  const [foodList, setFoodList] = useState<string[]>(
    cycleStatus.food_preferences,
  );
  const [customFood, setCustomFood] = useState('');
  const [loveLang, setLoveLang] = useState<LoveLanguageEnum>(
    cycleStatus.love_language,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setWellbeing(cycleStatus.wellbeing_summary);
      setFoodList(cycleStatus.food_preferences);
      setLoveLang(cycleStatus.love_language);
      setErrorMsg(null);
    }
  }, [visible, cycleStatus]);

  const saveMutation = useMutation({
    mutationFn: cycleApi.upsertDailyObservation,
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ['cycleStatus'] });
      onClose();
    },
    onError: (err: unknown) => {
      setErrorMsg(extractErrorMessage(err, t('common.error')));
    },
  });

  const toggleFood = (item: string): void => {
    setFoodList((prev) =>
      prev.includes(item) ? prev.filter((f) => f !== item) : [...prev, item],
    );
  };

  const addCustomFood = (): void => {
    const trimmed = customFood.trim();
    if (!trimmed) return;
    if (!foodList.includes(trimmed)) {
      setFoodList((prev) => [...prev, trimmed]);
    }
    setCustomFood('');
  };

  const handleSave = (): void => {
    setErrorMsg(null);
    if (!wellbeing.trim()) {
      setErrorMsg('Please describe how you feel today.');
      return;
    }
    saveMutation.mutate({
      wellbeing_description: wellbeing.trim(),
      food_preferences: foodList,
      desired_love_language: loveLang,
      symptom_tags: cycleStatus.symptom_tags,
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
        <View style={styles.sheetCard}>
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <Text style={styles.title}>{t('cycle.editObservation')}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <X size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.sheet}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

          <Text style={styles.sectionLabel}>{t('cycle.wellbeing')}</Text>
          <View style={styles.chipWrap}>
            {WELLBEING_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                style={styles.presetChip}
                onPress={() => setWellbeing(preset)}
              >
                <Text style={styles.presetText}>{preset}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={wellbeing}
            onChangeText={setWellbeing}
            multiline
            style={[styles.input, styles.multiline]}
          />

          <Text style={styles.sectionLabel}>{t('cycle.food')}</Text>
          <View style={styles.chipWrap}>
            {FOOD_PRESETS.map((food) => {
              const active = foodList.includes(food);
              return (
                <Pressable
                  key={food}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleFood(food)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {food}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.customFoodRow}>
            <TextInput
              value={customFood}
              onChangeText={setCustomFood}
              placeholder="Custom craving..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.flexInput]}
            />
            <Pressable style={styles.addFoodBtn} onPress={addCustomFood}>
              <Text style={styles.addFoodText}>+</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>{t('cycle.loveLanguage')}</Text>
          <View style={styles.llList}>
            {LOVE_LANGUAGES.map((ll) => {
              const active = loveLang === ll;
              return (
                <Pressable
                  key={ll}
                  style={[styles.llCard, active && styles.llCardActive]}
                  onPress={() => setLoveLang(ll)}
                >
                  <Text
                    style={[styles.llText, active && styles.llTextActive]}
                  >
                    {t(`loveLanguages.${ll}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <Pressable
            style={[
              styles.saveBtn,
              saveMutation.isPending && styles.disabled,
            ]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveText}>{t('common.save')}</Text>
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
    maxHeight: '80%',
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
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
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
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipActive: {
    backgroundColor: colors.accentGoldSoft,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accentGold,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
  },
  multiline: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  customFoodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexInput: {
    flex: 1,
  },
  addFoodBtn: {
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  addFoodText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  llList: {
    gap: spacing.xs,
  },
  llCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  llCardActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  llText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  llTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  saveText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
