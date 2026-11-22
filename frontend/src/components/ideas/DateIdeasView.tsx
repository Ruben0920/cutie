import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Flame,
  Globe,
  Heart,
  Home,
  Lock,
  Moon,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
  Zap,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { datesApi } from '@/api/endpoints';
import { AppLaunchModal } from '@/components/ideas/AppLaunchModal';
import { DateIdeaFormModal } from '@/components/ideas/DateIdeaFormModal';
import { useAuthStore } from '@/store/useAuthStore';
import {
  categoryColors,
  colors,
  energyColors,
  radii,
  spacing,
} from '@/theme/colors';
import type { DateCategoryEnum, DateIdea } from '@/types/api';

type CategoryStepSelection = DateCategoryEnum | 'surprises' | null;

const CATEGORY_TILES: Array<{
  key: DateCategoryEnum | 'surprises';
  tint: string;
  accent: string;
}> = [
  { key: 'romantic', tint: '#FCEEF3', accent: '#DB2777' },
  { key: 'home', tint: '#EEF4FD', accent: '#2563EB' },
  { key: 'food', tint: '#FEF3EA', accent: '#EA580C' },
  { key: 'relax', tint: '#F3EEFC', accent: '#7C3AED' },
  { key: 'active', tint: '#EBF9F2', accent: '#059669' },
  { key: 'extreme', tint: '#FDEEEE', accent: '#DC2626' },
  { key: 'surprises', tint: '#F5F0FC', accent: '#6D28D9' },
];

function renderSleekCategoryIcon(
  key: DateCategoryEnum | 'surprises',
  color: string,
  size: number,
): React.JSX.Element {
  switch (key) {
    case 'romantic':
      return <Heart size={size} color={color} strokeWidth={1.8} />;
    case 'home':
      return <Home size={size} color={color} strokeWidth={1.8} />;
    case 'food':
      return <Utensils size={size} color={color} strokeWidth={1.8} />;
    case 'relax':
      return <Moon size={size} color={color} strokeWidth={1.8} />;
    case 'active':
      return <Zap size={size} color={color} strokeWidth={1.8} />;
    case 'extreme':
      return <Flame size={size} color={color} strokeWidth={1.8} />;
    case 'surprises':
      return <Sparkles size={size} color={color} strokeWidth={1.8} />;
  }
}

export function DateIdeasView(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [activeCategory, setActiveCategory] =
    useState<CategoryStepSelection>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DateIdea | null>(null);
  const [openedIdea, setOpenedIdea] = useState<DateIdea | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const datesQuery = useQuery({
    queryKey: ['dateIdeas'],
    queryFn: () => datesApi.list(),
  });

  const selectTonightMutation = useMutation({
    mutationFn: datesApi.selectForTonight,
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      setOpenedIdea(null);
      setToastMsg(t('ideas.selectedToast'));
      setTimeout(() => setToastMsg(null), 2400);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: datesApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dateIdeas'] });
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      setOpenedIdea(null);
    },
  });

  const allIdeas = useMemo(() => datesQuery.data ?? [], [datesQuery.data]);

  const categoryCounts = useMemo(() => {
    const counts: Record<DateCategoryEnum | 'surprises', number> = {
      romantic: 0,
      home: 0,
      food: 0,
      relax: 0,
      active: 0,
      extreme: 0,
      surprises: 0,
    };
    for (const idea of allIdeas) {
      counts[idea.category] += 1;
      if (idea.is_surprise) {
        counts.surprises += 1;
      }
    }
    return counts;
  }, [allIdeas]);

  const filteredIdeas = useMemo(() => {
    if (!activeCategory) return [];
    if (activeCategory === 'surprises') {
      return allIdeas.filter((idea) => idea.is_surprise);
    }
    return allIdeas.filter((idea) => idea.category === activeCategory);
  }, [allIdeas, activeCategory]);

  const activeCategoryConfig = CATEGORY_TILES.find(
    (c) => c.key === activeCategory,
  );

  const handleSelectCategory = async (
    key: DateCategoryEnum | 'surprises',
  ): Promise<void> => {
    await Haptics.selectionAsync();
    setActiveCategory(key);
  };

  const handleOpenIdea = async (idea: DateIdea): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenedIdea(idea);
  };

  if (datesQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (datesQuery.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('common.error')}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => {
            void datesQuery.refetch();
          }}
        >
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const openedIsCreator = openedIdea?.creator_id === currentUser?.id;
  const openedIsMystery = Boolean(openedIdea?.is_surprise && !openedIsCreator);
  const openedAccent = openedIdea
    ? openedIsMystery
      ? colors.secondary
      : categoryColors[openedIdea.category]
    : colors.primary;

  return (
    <View style={styles.container}>
      {toastMsg ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      {activeCategory === null ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.categoryGrid}>
            {CATEGORY_TILES.map((tile) => {
              const count = categoryCounts[tile.key];
              const label =
                tile.key === 'surprises'
                  ? t('ideas.onlySurprises')
                  : t(`categories.${tile.key}`);

              return (
                <View key={tile.key} style={styles.categoryCell}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.categorySquare,
                      { backgroundColor: tile.tint },
                      pressed && styles.tilePressed,
                    ]}
                    onPress={() => {
                      void handleSelectCategory(tile.key);
                    }}
                  >
                    <View style={styles.categoryIconBubble}>
                      {renderSleekCategoryIcon(tile.key, tile.accent, 22)}
                    </View>
                    <View style={styles.categoryMeta}>
                      <Text style={styles.categoryTitle} numberOfLines={1}>
                        {label}
                      </Text>
                      <Text style={styles.categoryCount}>
                        {t('ideas.ideasCount', { count })}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.stepTwoContainer}>
          <View style={styles.stepTwoHeader}>
            <Pressable
              style={styles.backPill}
              onPress={() => setActiveCategory(null)}
            >
              <ChevronLeft size={16} color={colors.textPrimary} strokeWidth={2} />
              <Text style={styles.backPillText}>
                {t('ideas.backToCategories')}
              </Text>
            </Pressable>

            <Text style={styles.stepTwoTitle}>
              {activeCategory === 'surprises'
                ? t('ideas.onlySurprises')
                : t(`categories.${activeCategory}`)}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {filteredIdeas.length === 0 ? (
              <Text style={styles.emptyText}>
                No ideas in this category yet.
              </Text>
            ) : (
              <View style={styles.ideaGrid}>
                {filteredIdeas.map((idea) => {
                  const isCreator = idea.creator_id === currentUser?.id;
                  const isMystery = idea.is_surprise && !isCreator;
                  const tileTint = isMystery
                    ? '#F2ECFD'
                    : activeCategoryConfig?.tint ?? '#FFFFFF';
                  const tileAccent = isMystery
                    ? colors.secondary
                    : categoryColors[idea.category];

                  return (
                    <View key={idea.id} style={styles.ideaCell}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.ideaSquare,
                          { backgroundColor: tileTint },
                          pressed && styles.tilePressed,
                        ]}
                        onPress={() => {
                          void handleOpenIdea(idea);
                        }}
                      >
                        <View style={styles.ideaTopRow}>
                          {isMystery ? (
                            <Lock
                              size={16}
                              color={tileAccent}
                              strokeWidth={1.9}
                            />
                          ) : (
                            renderSleekCategoryIcon(
                              idea.category,
                              tileAccent,
                              16,
                            )
                          )}
                          <Text
                            style={[
                              styles.ideaEnergyMini,
                              { color: energyColors[idea.required_energy].main },
                            ]}
                          >
                            {t(`energy.${idea.required_energy}`)}
                          </Text>
                        </View>

                        <Text style={styles.ideaSquareTitle} numberOfLines={3}>
                          {idea.title}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <Pressable
        style={styles.floatingAddBtn}
        onPress={() => {
          setEditingIdea(null);
          setFormModalOpen(true);
        }}
      >
        <Plus size={18} color={colors.white} strokeWidth={2.2} />
        <Text style={styles.floatingAddText}>{t('ideas.addDate')}</Text>
      </Pressable>

      <AppLaunchModal
        visible={Boolean(openedIdea)}
        accentColor={openedAccent}
        isMystery={openedIsMystery}
        onClose={() => setOpenedIdea(null)}
      >
        {openedIdea ? (
          <>
            <View style={styles.popupHeader}>
              <View
                style={[
                  styles.popupIconWrap,
                  {
                    backgroundColor: openedIsMystery
                      ? '#EFE7FE'
                      : `${openedAccent}18`,
                  },
                ]}
              >
                {openedIsMystery ? (
                  <Lock size={22} color={openedAccent} strokeWidth={1.9} />
                ) : (
                  renderSleekCategoryIcon(openedIdea.category, openedAccent, 22)
                )}
              </View>

              <View style={styles.popupHeaderMeta}>
                <Text style={styles.popupTitle}>{openedIdea.title}</Text>
                <View style={styles.popupBadges}>
                  <Text
                    style={[
                      styles.popupMetaChip,
                      { color: categoryColors[openedIdea.category] },
                    ]}
                  >
                    {t(`categories.${openedIdea.category}`)}
                  </Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text
                    style={[
                      styles.popupMetaChip,
                      { color: energyColors[openedIdea.required_energy].main },
                    ]}
                  >
                    {t(`energy.${openedIdea.required_energy}`)}
                  </Text>
                </View>
              </View>
            </View>

            {openedIsMystery ? (
              <View style={styles.subtleStatusRow}>
                <Lock size={13} color={colors.secondary} />
                <Text style={styles.subtleStatusText}>
                  {t('ideas.surpriseHiddenBadge')}
                </Text>
              </View>
            ) : openedIdea.is_surprise && openedIsCreator ? (
              <View style={styles.subtleStatusRow}>
                <Sparkles size={13} color={colors.secondary} />
                <Text style={styles.subtleStatusText}>
                  {t('ideas.surpriseAuthorBadge')}
                </Text>
              </View>
            ) : null}

            {openedIdea.suitable_for_long_distance ? (
              <View style={styles.subtleStatusRow}>
                <Globe size={13} color={colors.secondary} />
                <Text style={styles.subtleStatusText}>
                  {t('dice.longDistancePill')}
                </Text>
              </View>
            ) : null}

            <View style={styles.descriptionBox}>
              <Text style={styles.popupDesc}>
                {openedIdea.description || t('ideas.tapToOpen')}
              </Text>
            </View>

            <Pressable
              style={styles.chooseTonightBtn}
              onPress={() => selectTonightMutation.mutate(openedIdea.id)}
              disabled={selectTonightMutation.isPending}
            >
              {selectTonightMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.chooseTonightText}>
                  {t('ideas.selectTonight')}
                </Text>
              )}
            </Pressable>

            {!openedIsMystery ? (
              <View style={styles.popupSecondaryRow}>
                <Pressable
                  style={styles.popupEditBtn}
                  onPress={() => {
                    const target = openedIdea;
                    setOpenedIdea(null);
                    setEditingIdea(target);
                    setFormModalOpen(true);
                  }}
                >
                  <Pencil size={14} color={colors.textPrimary} />
                  <Text style={styles.popupEditText}>Edit</Text>
                </Pressable>

                <Pressable
                  style={styles.popupDeleteBtn}
                  onPress={() => deleteMutation.mutate(openedIdea.id)}
                >
                  <Trash2 size={14} color={colors.danger} />
                  <Text style={styles.popupDeleteText}>
                    {t('common.delete')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </AppLaunchModal>

      <DateIdeaFormModal
        visible={formModalOpen}
        editingIdea={editingIdea}
        onClose={() => setFormModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.xl,
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
  },
  toast: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  toastText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 82,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryCell: {
    width: '33.3333%',
    padding: 4,
  },
  categorySquare: {
    aspectRatio: 1,
    borderRadius: 20,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  categoryIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMeta: {
    gap: 1,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  categoryCount: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tilePressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },
  stepTwoContainer: {
    flex: 1,
    gap: spacing.sm,
  },
  stepTwoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  backPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepTwoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  ideaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  ideaCell: {
    width: '33.3333%',
    padding: 4,
  },
  ideaSquare: {
    aspectRatio: 1,
    borderRadius: 18,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  ideaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ideaEnergyMini: {
    fontSize: 10,
    fontWeight: '700',
  },
  ideaSquareTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 15,
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    backgroundColor: colors.textPrimary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  floatingAddText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  popupHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  popupIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupHeaderMeta: {
    flex: 1,
    gap: 3,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  popupBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  popupMetaChip: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  subtleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
  },
  subtleStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  descriptionBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  popupDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  chooseTonightBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  chooseTonightText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  popupSecondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  popupEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
  },
  popupEditText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  popupDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
  },
  popupDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
});
