import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ExternalLink, Plus, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
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
import { GiftFormModal } from '@/components/ideas/GiftFormModal';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radii, spacing } from '@/theme/colors';
import type { GiftIdea } from '@/types/api';

type WishlistOwnerFilter = 'partner' | 'mine';

export function GiftsWishlistView(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [filterBy, setFilterBy] = useState<WishlistOwnerFilter>('partner');
  const [modalVisible, setModalVisible] = useState(false);

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
    onSuccess: async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await queryClient.invalidateQueries({ queryKey: ['giftIdeas'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: giftsApi.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['giftIdeas'] });
    },
  });

  const renderGiftCard = (gift: GiftIdea): React.JSX.Element => {
    const isMine = gift.author_id === currentUser?.id;
    const stars = '★'.repeat(gift.priority) + '☆'.repeat(5 - gift.priority);

    return (
      <View key={gift.id} style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{gift.title}</Text>
          {gift.price_estimate !== null ? (
            <Text style={styles.priceText}>
              ${Number(gift.price_estimate).toFixed(0)}
            </Text>
          ) : null}
        </View>

        <Text style={styles.starsText}>{stars}</Text>

        <View style={styles.actionsRow}>
          <Pressable
            style={styles.linkBtn}
            onPress={() => {
              void Linking.openURL(gift.direct_url);
            }}
          >
            <ExternalLink size={14} color={colors.secondary} />
            <Text style={styles.linkBtnText}>{t('ideas.openLink')}</Text>
          </Pressable>

          {!isMine ? (
            <View style={styles.partnerActions}>
              <Pressable
                style={[
                  styles.reserveBtn,
                  gift.is_reserved_by_partner && styles.reserveBtnActive,
                ]}
                onPress={() =>
                  reserveMutation.mutate({
                    giftId: gift.id,
                    isReserved: !gift.is_reserved_by_partner,
                  })
                }
              >
                <Text
                  style={[
                    styles.reserveText,
                    gift.is_reserved_by_partner && styles.reserveTextActive,
                  ]}
                >
                  {gift.is_reserved_by_partner
                    ? t('ideas.reservedByMe')
                    : t('ideas.reserveSecretly')}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.purchasedBtn,
                  gift.is_purchased && styles.purchasedBtnActive,
                ]}
                onPress={() =>
                  reserveMutation.mutate({
                    giftId: gift.id,
                    isPurchased: !gift.is_purchased,
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
              onPress={() => deleteMutation.mutate(gift.id)}
            >
              <Trash2 size={16} color={colors.danger} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

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
        <ScrollView contentContainerStyle={styles.list}>
          {(giftsQuery.data ?? []).length === 0 ? (
            <Text style={styles.emptyText}>No gift ideas here yet.</Text>
          ) : (
            (giftsQuery.data ?? []).map(renderGiftCard)
          )}
        </ScrollView>
      )}

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus size={22} color={colors.white} />
        <Text style={styles.fabText}>{t('ideas.addGift')}</Text>
      </Pressable>

      <GiftFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
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
    backgroundColor: colors.surfaceMuted,
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
  list: {
    gap: spacing.md,
    paddingBottom: 90,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTop: {
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
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.secondary,
  },
  starsText: {
    color: colors.accentGold,
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  linkBtnText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 12,
  },
  partnerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  reserveBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  reserveBtnActive: {
    backgroundColor: colors.primarySoft,
  },
  reserveText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  reserveTextActive: {
    color: colors.primaryDark,
  },
  purchasedBtn: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  purchasedBtnActive: {
    backgroundColor: colors.successSoft,
  },
  purchasedText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deleteBtn: {
    padding: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.dangerSoft,
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
