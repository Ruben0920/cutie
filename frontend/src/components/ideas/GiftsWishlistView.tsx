import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle2,
  ExternalLink,
  Gift,
  Lock,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { giftsApi } from '@/api/endpoints';
import { AppLaunchModal } from '@/components/ideas/AppLaunchModal';
import { GiftFormModal } from '@/components/ideas/GiftFormModal';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radii, spacing } from '@/theme/colors';
import type { GiftIdea } from '@/types/api';

type WishlistOwnerFilter = 'partner' | 'mine';

const GIFT_TILE_PALETTE = [
  '#EC4899',
  '#8B5CF6',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#E11D48',
];

function getGiftTileColor(gift: GiftIdea, index: number): string {
  if (gift.is_purchased) return colors.success;
  if (gift.is_reserved_by_partner) return colors.secondary;
  return GIFT_TILE_PALETTE[index % GIFT_TILE_PALETTE.length];
}

export function GiftsWishlistView(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [filterBy, setFilterBy] = useState<WishlistOwnerFilter>('partner');
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [openedGift, setOpenedGift] = useState<GiftIdea | null>(null);

  const giftsQuery = useQuery({
    queryKey: ['giftIdeas', filterBy],
    queryFn: () => giftsApi.list(filterBy),
  });

  const reserveMutation = useMutation({
    mutationFn: ({
      giftId,
      isReserved,
      isPurchased,
    }: {
      giftId: string;
      isReserved?: boolean;
      isPurchased?: boolean;
    }) =>
      giftsApi.reserve(giftId, {
        is_reserved_by_partner: isReserved,
        is_purchased: isPurchased,
      }),
    onSuccess: async (updatedGift) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setOpenedGift(updatedGift);
      await queryClient.invalidateQueries({ queryKey: ['giftIdeas'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: giftsApi.remove,
    onSuccess: async () => {
      setOpenedGift(null);
      await queryClient.invalidateQueries({ queryKey: ['giftIdeas'] });
    },
  });

  const sections = useMemo(() => {
    const gifts = giftsQuery.data ?? [];
    if (filterBy === 'mine') {
      return gifts.length > 0
        ? [{ key: 'mine', title: t('ideas.myWishlist'), items: gifts }]
        : [];
    }

    const available = gifts.filter(
      (g) => !g.is_reserved_by_partner && !g.is_purchased,
    );
    const claimed = gifts.filter(
      (g) => Boolean(g.is_reserved_by_partner) || g.is_purchased,
    );

    const out: Array<{ key: string; title: string; items: GiftIdea[] }> = [];
    if (available.length > 0) {
      out.push({
        key: 'available',
        title: t('ideas.partnerWishlist'),
        items: available,
      });
    }
    if (claimed.length > 0) {
      out.push({
        key: 'claimed',
        title: t('ideas.reservedByMe'),
        items: claimed,
      });
    }
    return out;
  }, [giftsQuery.data, filterBy, t]);

  const handleOpenGiftApp = async (gift: GiftIdea): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenedGift(gift);
  };

  const renderGiftTile = (gift: GiftIdea, index: number): React.JSX.Element => {
    const isMine = gift.author_id === currentUser?.id;
    const tileColor = getGiftTileColor(gift, index);

    return (
      <Pressable
        key={gift.id}
        style={({ pressed }) => [
          styles.appTileSlot,
          pressed && styles.appTilePressed,
        ]}
        onPress={() => {
          void handleOpenGiftApp(gift);
        }}
      >
        <View style={[styles.appSquircle, { backgroundColor: tileColor }]}>
          <View style={styles.appGloss} />
          {gift.is_purchased && !isMine ? (
            <CheckCircle2 size={30} color={colors.white} strokeWidth={2.2} />
          ) : gift.is_reserved_by_partner && !isMine ? (
            <Lock size={28} color={colors.white} strokeWidth={2.2} />
          ) : gift.priority >= 4 ? (
            <Gift size={30} color={colors.white} strokeWidth={2.2} />
          ) : (
            <ShoppingBag size={28} color={colors.white} strokeWidth={2.2} />
          )}

          {gift.price_estimate !== null ? (
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>
                ${Number(gift.price_estimate).toFixed(0)}
              </Text>
            </View>
          ) : null}

          <View style={styles.priorityCorner}>
            <Text style={styles.priorityCornerText}>★{gift.priority}</Text>
          </View>
        </View>

        <Text style={styles.appLabel} numberOfLines={2}>
          {gift.title}
        </Text>
      </Pressable>
    );
  };

  const openedIsMine = openedGift?.author_id === currentUser?.id;

  return (
    <View style={styles.container}>
      <View style={styles.subTabs}>
        <Pressable
          style={[
            styles.subTab,
            filterBy === 'partner' && styles.subTabActive,
          ]}
          onPress={() => setFilterBy('partner')}
        >
          <Text
            style={[
              styles.subTabText,
              filterBy === 'partner' && styles.subTabTextActive,
            ]}
          >
            {t('ideas.partnerWishlist')}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.subTab, filterBy === 'mine' && styles.subTabActive]}
          onPress={() => setFilterBy('mine')}
        >
          <Text
            style={[
              styles.subTabText,
              filterBy === 'mine' && styles.subTabTextActive,
            ]}
          >
            {t('ideas.myWishlist')}
          </Text>
        </Pressable>
      </View>

      {giftsQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : giftsQuery.isError ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('common.error')}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              void giftsQuery.refetch();
            }}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.homeScreenScroll}>
          {sections.length === 0 ? (
            <Text style={styles.emptyText}>No gift ideas here yet.</Text>
          ) : (
            sections.map((section) => (
              <View key={section.key} style={styles.appSectionFolder}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.countPill}>
                    <Text style={styles.countText}>{section.items.length}</Text>
                  </View>
                </View>

                <View style={styles.appGrid}>
                  {section.items.map((gift, idx) => renderGiftTile(gift, idx))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <View style={styles.iphoneDock}>
        <Pressable
          style={styles.dockAddButton}
          onPress={() => setFormModalVisible(true)}
        >
          <Plus size={20} color={colors.white} />
          <Text style={styles.dockAddText}>{t('ideas.addGift')}</Text>
        </Pressable>
      </View>

      <AppLaunchModal
        visible={Boolean(openedGift)}
        accentColor={colors.primary}
        onClose={() => setOpenedGift(null)}
      >
        {openedGift ? (
          <>
            <View style={styles.popupHeader}>
              <View style={styles.popupGiftIcon}>
                <Gift size={28} color={colors.white} />
              </View>
              <View style={styles.popupHeaderMeta}>
                <Text style={styles.popupTitle}>{openedGift.title}</Text>
                <Text style={styles.starsText}>
                  {'★'.repeat(openedGift.priority)}
                  {'☆'.repeat(5 - openedGift.priority)}
                </Text>
              </View>
            </View>

            <View style={styles.metaBox}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>{t('ideas.priceLabel')}</Text>
                <Text style={styles.metaValue}>
                  {openedGift.price_estimate !== null
                    ? `$${Number(openedGift.price_estimate).toFixed(0)}`
                    : '—'}
                </Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>{t('ideas.priorityLabel')}</Text>
                <Text style={styles.metaValue}>{openedGift.priority} / 5</Text>
              </View>
            </View>

            <Pressable
              style={styles.openLinkBtn}
              onPress={() => {
                void Linking.openURL(openedGift.direct_url);
              }}
            >
              <ExternalLink size={16} color={colors.white} />
              <Text style={styles.openLinkText}>{t('ideas.openLink')}</Text>
            </Pressable>

            {!openedIsMine ? (
              <View style={styles.partnerActions}>
                <Pressable
                  style={[
                    styles.reserveBtn,
                    openedGift.is_reserved_by_partner && styles.reserveBtnActive,
                  ]}
                  onPress={() =>
                    reserveMutation.mutate({
                      giftId: openedGift.id,
                      isReserved: !openedGift.is_reserved_by_partner,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.reserveText,
                      openedGift.is_reserved_by_partner &&
                        styles.reserveTextActive,
                    ]}
                  >
                    {openedGift.is_reserved_by_partner
                      ? t('ideas.reservedByMe')
                      : t('ideas.reserveSecretly')}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.purchasedBtn,
                    openedGift.is_purchased && styles.purchasedBtnActive,
                  ]}
                  onPress={() =>
                    reserveMutation.mutate({
                      giftId: openedGift.id,
                      isPurchased: !openedGift.is_purchased,
                    })
                  }
                >
                  <Text style={styles.purchasedText}>
                    {t('ideas.markPurchased')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.deleteBtn}
                onPress={() => deleteMutation.mutate(openedGift.id)}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={styles.deleteText}>{t('common.delete')}</Text>
              </Pressable>
            )}
          </>
        ) : null}
      </AppLaunchModal>

      <GiftFormModal
        visible={formModalVisible}
        onClose={() => setFormModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  subTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  subTabActive: {
    backgroundColor: colors.surface,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
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
  priceBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.white,
  },
  priceBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  priorityCorner: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.accentGoldSoft,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  priorityCornerText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accentGold,
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
  popupGiftIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupHeaderMeta: {
    flex: 1,
    gap: 4,
  },
  popupTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  starsText: {
    color: colors.accentGold,
    fontSize: 15,
  },
  metaBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  metaCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  openLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.secondary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
  },
  openLinkText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  partnerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reserveBtn: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  reserveBtnActive: {
    backgroundColor: colors.primarySoft,
  },
  reserveText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  reserveTextActive: {
    color: colors.primaryDark,
  },
  purchasedBtn: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  purchasedBtnActive: {
    backgroundColor: colors.successSoft,
  },
  purchasedText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  deleteText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
});
