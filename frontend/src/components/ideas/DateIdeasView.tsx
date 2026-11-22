import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Flame,
  Globe,
  Heart,
  Home,
  Lock,
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

const CATEGORIES: DateCategoryEnum[] = [
  'romantic',
  'home',
  'food',
  'relax',
  'active',
  'extreme',
];

function renderCategoryAppIcon(
  category: DateCategoryEnum,
  isMystery: boolean,
  size: number,
): React.JSX.Element {
  if (isMystery) {
    return <Lock size={size} color={colors.white} strokeWidth={2.2} />;
  }
  switch (category) {
    case 'romantic':
      return <Heart size={size} color={colors.white} strokeWidth={2.2} />;
    case 'active':
      return <Zap size={size} color={colors.white} strokeWidth={2.2} />;
    case 'relax':
      return <Sparkles size={size} color={colors.white} strokeWidth={2.2} />;
    case 'food':
      return <Utensils size={size} color={colors.white} strokeWidth={2.2} />;
    case 'extreme':
      return <Flame size={size} color={colors.white} strokeWidth={2.2} />;
    case 'home':
      return <Home size={size} color={colors.white} strokeWidth={2.2} />;
  }
}

export function DateIdeasView(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [selectedCategory, setSelectedCategory] = useState<
    DateCategoryEnum | 'all'
  >('all');
  const [onlySurprises, setOnlySurprises] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DateIdea | null>(null);
  const [openedIdea, setOpenedIdea] = useState<DateIdea | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const datesQuery = useQuery({
    queryKey: ['dateIdeas', selectedCategory, onlySurprises],
    queryFn: () =>
      datesApi.list({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        only_surprises: onlySurprises || undefined,
      }),
  });

  const selectTonightMutation = useMutation({
    mutationFn: datesApi.selectForTonight,
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      setOpenedIdea(null);
      setToastMsg(t('ideas.selectedToast'));
      setTimeout(() => setToastMsg(null), 2500);
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

  const groupedSections = useMemo(() => {
    const items = datesQuery.data ?? [];
    if (selectedCategory !== 'all') {
      return items.length > 0
        ? [{ category: selectedCategory, items }]
        : [];
    }
    return CATEGORIES.map((cat) => ({
      category: cat,
      items: items.filter((idea) => idea.category === cat),
    })).filter((group) => group.items.length > 0);
  }, [datesQuery.data, selectedCategory]);

  const handleOpenAppTile = async (idea: DateIdea): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenedIdea(idea);
  };

  const renderAppTile = (idea: DateIdea): React.JSX.Element => {
    const isCreator = idea.creator_id === currentUser?.id;
    const isPartnerMystery = idea.is_surprise && !isCreator;
    const tileColor = isPartnerMystery
      ? colors.secondary
      : categoryColors[idea.category];
    const energyStyle = energyColors[idea.required_energy];

    return (
      <Pressable
        key={idea.id}
        style={({ pressed }) => [
          styles.appTileSlot,
          pressed && styles.appTilePressed,
        ]}
        onPress={() => {
          void handleOpenAppTile(idea);
        }}
      >
        <View style={[styles.appSquircle, { backgroundColor: tileColor }]}>
          <View style={styles.appGloss} />
          {renderCategoryAppIcon(idea.category, isPartnerMystery, 30)}

          <View
            style={[
              styles.cornerBadge,
              { backgroundColor: energyStyle.soft },
            ]}
          >
            <Text style={[styles.cornerBadgeText, { color: energyStyle.main }]}>
              {idea.required_energy === 'low'
                ? '🔋'
                : idea.required_energy === 'medium'
                  ? '⚡'
                  : '🔥'}
            </Text>
          </View>

          {idea.is_surprise ? (
            <View style={styles.surpriseCornerDot}>
              <Text style={styles.surpriseCornerText}>✨</Text>
            </View>
          ) : idea.suitable_for_long_distance ? (
            <View style={styles.ldCornerDot}>
              <Globe size={10} color={colors.white} />
            </View>
          ) : null}
        </View>

        <Text style={styles.appLabel} numberOfLines={2}>
          {idea.title}
        </Text>
      </Pressable>
    );
  };

  const openedIsCreator = openedIdea?.creator_id === currentUser?.id;
  const openedIsMystery = Boolean(openedIdea?.is_surprise && !openedIsCreator);
  const openedAccent = openedIdea
    ? openedIsMystery
      ? colors.secondary
      : categoryColors[openedIdea.category]
    : colors.primary;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        <Pressable
          style={[
            styles.filterChip,
            selectedCategory === 'all' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text
            style={[
              styles.filterText,
              selectedCategory === 'all' && styles.filterTextActive,
            ]}
          >
            {t('ideas.all')}
          </Text>
        </Pressable>

        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[
              styles.filterChip,
              selectedCategory === cat && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === cat && styles.filterTextActive,
              ]}
            >
              {t(`categories.${cat}`)}
            </Text>
          </Pressable>
        ))}

        <Pressable
          style={[
            styles.filterChip,
            onlySurprises && styles.surpriseFilterActive,
          ]}
          onPress={() => setOnlySurprises((prev) => !prev)}
        >
          <Text
            style={[
              styles.filterText,
              onlySurprises && styles.surpriseFilterText,
            ]}
          >
            {t('ideas.onlySurprises')}
          </Text>
        </Pressable>
      </ScrollView>

      {toastMsg ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      {datesQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : datesQuery.isError ? (
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
      ) : (
        <ScrollView contentContainerStyle={styles.homeScreenScroll}>
          {groupedSections.length === 0 ? (
            <Text style={styles.emptyText}>No date ideas match this filter.</Text>
          ) : (
            groupedSections.map((section) => (
              <View key={section.category} style={styles.appSectionFolder}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {t(`categories.${section.category}`)}
                  </Text>
                  <View style={styles.countPill}>
                    <Text style={styles.countText}>{section.items.length}</Text>
                  </View>
                </View>

                <View style={styles.appGrid}>
                  {section.items.map(renderAppTile)}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <View style={styles.iphoneDock}>
        <Pressable
          style={styles.dockAddButton}
          onPress={() => {
            setEditingIdea(null);
            setFormModalOpen(true);
          }}
        >
          <Plus size={20} color={colors.white} />
          <Text style={styles.dockAddText}>{t('ideas.addDate')}</Text>
        </Pressable>
      </View>

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
                style={[styles.popupAppIcon, { backgroundColor: openedAccent }]}
              >
                {renderCategoryAppIcon(
                  openedIdea.category,
                  openedIsMystery,
                  28,
                )}
              </View>

              <View style={styles.popupHeaderMeta}>
                <Text style={styles.popupTitle}>{openedIdea.title}</Text>
                <View style={styles.popupBadges}>
                  <View
                    style={[
                      styles.catBadge,
                      { borderColor: categoryColors[openedIdea.category] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catBadgeText,
                        { color: categoryColors[openedIdea.category] },
                      ]}
                    >
                      {t(`categories.${openedIdea.category}`)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.energyBadge,
                      {
                        backgroundColor:
                          energyColors[openedIdea.required_energy].soft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.energyText,
                        {
                          color:
                            energyColors[openedIdea.required_energy].main,
                        },
                      ]}
                    >
                      {t(`energy.${openedIdea.required_energy}`)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {openedIsMystery ? (
              <View style={styles.surpriseBadge}>
                <Lock size={13} color={colors.accentGold} />
                <Text style={styles.surpriseBadgeText}>
                  {t('ideas.surpriseHiddenBadge')}
                </Text>
              </View>
            ) : openedIdea.is_surprise && openedIsCreator ? (
              <View style={styles.authorSurpriseBadge}>
                <Text style={styles.authorSurpriseText}>
                  {t('ideas.surpriseAuthorBadge')}
                </Text>
              </View>
            ) : null}

            {openedIdea.suitable_for_long_distance ? (
              <View style={styles.ldRow}>
                <Globe size={14} color={colors.secondary} />
                <Text style={styles.ldText}>{t('dice.longDistancePill')}</Text>
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
                  <Pencil size={15} color={colors.textPrimary} />
                  <Text style={styles.popupEditText}>Edit</Text>
                </Pressable>

                <Pressable
                  style={styles.popupDeleteBtn}
                  onPress={() => deleteMutation.mutate(openedIdea.id)}
                >
                  <Trash2 size={15} color={colors.danger} />
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
  filterScroll: {
    maxHeight: 42,
  },
  filterRow: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  surpriseFilterActive: {
    backgroundColor: colors.accentGoldSoft,
    borderColor: colors.accentGold,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  surpriseFilterText: {
    color: colors.accentGold,
    fontWeight: '700',
  },
  toast: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  toastText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
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
  homeScreenScroll: {
    gap: spacing.lg,
    paddingBottom: 96,
  },
  appSectionFolder: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 26,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    gap: spacing.md,
    shadowColor: '#2B1328',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  countPill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.lg,
  },
  appTileSlot: {
    width: '33.333%',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 6,
  },
  appTilePressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.85,
  },
  appSquircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  appGloss: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: 22,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  cornerBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  cornerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  surpriseCornerDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentGoldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  surpriseCornerText: {
    fontSize: 10,
  },
  ldCornerDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  appLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 15,
  },
  iphoneDock: {
    position: 'absolute',
    bottom: 12,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 28,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  dockAddButton: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dockAddText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  popupHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  popupAppIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupHeaderMeta: {
    flex: 1,
    gap: 6,
  },
  popupTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  popupBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  catBadge: {
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  energyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  energyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  surpriseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentGoldSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  surpriseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentGold,
  },
  authorSurpriseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  authorSurpriseText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  ldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ldText: {
    fontSize: 12,
    fontWeight: '700',
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
    fontWeight: '800',
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
