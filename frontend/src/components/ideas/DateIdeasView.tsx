import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Globe, Lock, Pencil, Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
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
  'active',
  'relax',
  'food',
  'extreme',
  'home',
];

export function DateIdeasView(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [selectedCategory, setSelectedCategory] = useState<
    DateCategoryEnum | 'all'
  >('all');
  const [onlySurprises, setOnlySurprises] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<DateIdea | null>(null);
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
      setToastMsg(t('ideas.selectedToast'));
      setTimeout(() => setToastMsg(null), 2500);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: datesApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dateIdeas'] });
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
    },
  });

  const renderDateCard = (idea: DateIdea): React.JSX.Element => {
    const isCreator = idea.creator_id === currentUser?.id;
    const isPartnerMystery = idea.is_surprise && !isCreator;
    const energyStyle = energyColors[idea.required_energy];
    const catColor = categoryColors[idea.category];

    return (
      <View
        key={idea.id}
        style={[
          styles.card,
          isPartnerMystery && styles.mysteryCard,
        ]}
      >
        {isPartnerMystery ? (
          <View style={styles.surpriseBadge}>
            <Lock size={13} color={colors.accentGold} />
            <Text style={styles.surpriseBadgeText}>
              {t('ideas.surpriseHiddenBadge')}
            </Text>
          </View>
        ) : idea.is_surprise && isCreator ? (
          <View style={styles.authorSurpriseBadge}>
            <Text style={styles.authorSurpriseText}>
              {t('ideas.surpriseAuthorBadge')}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{idea.title}</Text>
          {idea.suitable_for_long_distance ? (
            <Globe size={16} color={colors.secondary} />
          ) : null}
        </View>

        {idea.description ? (
          <Text style={styles.cardDesc}>{idea.description}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={[styles.catBadge, { borderColor: catColor }]}>
            <Text style={[styles.catBadgeText, { color: catColor }]}>
              {t(`categories.${idea.category}`)}
            </Text>
          </View>
          <View
            style={[styles.energyBadge, { backgroundColor: energyStyle.soft }]}
          >
            <Text style={[styles.energyText, { color: energyStyle.main }]}>
              {t(`energy.${idea.required_energy}`)}
            </Text>
          </View>
        </View>

        <View style={styles.footerActions}>
          <Pressable
            style={styles.selectTonightBtn}
            onPress={() => selectTonightMutation.mutate(idea.id)}
            disabled={selectTonightMutation.isPending}
          >
            <Text style={styles.selectTonightText}>
              {t('ideas.selectTonight')}
            </Text>
          </Pressable>

          {!isPartnerMystery ? (
            <View style={styles.iconActions}>
              <Pressable
                style={styles.iconBtn}
                onPress={() => {
                  setEditingIdea(idea);
                  setModalOpen(true);
                }}
              >
                <Pencil size={15} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={() => deleteMutation.mutate(idea.id)}
              >
                <Trash2 size={15} color={colors.danger} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

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
        <ScrollView contentContainerStyle={styles.list}>
          {(datesQuery.data ?? []).length === 0 ? (
            <Text style={styles.emptyText}>No date ideas match this filter.</Text>
          ) : (
            (datesQuery.data ?? []).map(renderDateCard)
          )}
        </ScrollView>
      )}

      <Pressable
        style={styles.fab}
        onPress={() => {
          setEditingIdea(null);
          setModalOpen(true);
        }}
      >
        <Plus size={22} color={colors.white} />
        <Text style={styles.fabText}>{t('ideas.addDate')}</Text>
      </Pressable>

      <DateIdeaFormModal
        visible={modalOpen}
        editingIdea={editingIdea}
        onClose={() => setModalOpen(false)}
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
    maxHeight: 44,
  },
  filterRow: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
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
  list: {
    gap: spacing.md,
    paddingBottom: 90,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  mysteryCard: {
    backgroundColor: colors.secondarySoft,
    borderColor: colors.accentGold,
    borderWidth: 1.5,
  },
  surpriseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.accentGoldSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  surpriseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accentGold,
  },
  authorSurpriseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  authorSurpriseText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
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
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  selectTonightBtn: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  selectTonightText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  iconActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconBtn: {
    padding: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 0,
    left: 0,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
});
