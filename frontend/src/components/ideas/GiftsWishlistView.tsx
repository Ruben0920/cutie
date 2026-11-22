import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Gift,
  Heart,
  Lock,
  ShoppingBag,
  Trash2,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { giftsApi } from '@/api/endpoints';
import { AppLaunchModal } from '@/components/ideas/AppLaunchModal';
import { ExpandablePlusFab } from '@/components/ideas/ExpandablePlusFab';
import { GiftFormModal } from '@/components/ideas/GiftFormModal';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radii, spacing } from '@/theme/colors';
import type { GiftIdea } from '@/types/api';

type WishlistStep = 'partner' | 'mine' | null;

const GIFT_TINTS = ['#FCEEF3', '#F2EDFD', '#FEF3EA', '#EAFBF3', '#EDF4FD'];

interface GiftsWishlistViewProps {
  onBackToCategories?: () => void;
}

export function GiftsWishlistView({
  onBackToCategories,
}: GiftsWishlistViewProps): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [selectedFolder, setSelectedFolder] = useState<WishlistStep>(null);
  const [lastFolder, setLastFolder] = useState<'partner' | 'mine' | null>(null);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [openedGift, setOpenedGift] = useState<GiftIdea | null>(null);

  const dragX = useSharedValue(0);

  const giftsQuery = useQuery({
    queryKey: ['giftIdeas', 'all'],
    queryFn: () => giftsApi.list('all'),
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

  const allGifts = useMemo(() => giftsQuery.data ?? [], [giftsQuery.data]);
  const partnerGifts = useMemo(
    () => allGifts.filter((g) => g.author_id !== currentUser?.id),
    [allGifts, currentUser?.id],
  );
  const myGifts = useMemo(
    () => allGifts.filter((g) => g.author_id === currentUser?.id),
    [allGifts, currentUser?.id],
  );

  const activeGifts =
    selectedFolder === 'partner'
      ? partnerGifts
      : selectedFolder === 'mine'
        ? myGifts
        : [];

  const handleOpenFolder = useCallback(
    async (folder: 'partner' | 'mine'): Promise<void> => {
      await Haptics.selectionAsync();
      setLastFolder(folder);
      setSelectedFolder(folder);
    },
    [],
  );

  const handleBackFromFolder = useCallback((): void => {
    if (selectedFolder !== null) {
      setLastFolder(selectedFolder);
    }
    setSelectedFolder(null);
  }, [selectedFolder]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-20, 20])
        .failOffsetY([-14, 14])
        .onUpdate((e) => {
          if (e.translationX > 0 && (selectedFolder !== null || onBackToCategories)) {
            dragX.value = Math.min(e.translationX * 0.35, 80);
          } else if (selectedFolder === null && lastFolder !== null && e.translationX < 0) {
            dragX.value = Math.max(e.translationX * 0.35, -80);
          }
        })
        .onEnd((e) => {
          dragX.value = withSpring(0, { damping: 20, stiffness: 260 });
          if (e.translationX > 65 || e.velocityX > 450) {
            if (selectedFolder !== null) {
              void Haptics.selectionAsync();
              handleBackFromFolder();
            } else if (onBackToCategories) {
              void Haptics.selectionAsync();
              onBackToCategories();
            }
          } else if (
            selectedFolder === null &&
            lastFolder !== null &&
            (e.translationX < -65 || e.velocityX < -450)
          ) {
            void handleOpenFolder(lastFolder);
          }
        }),
    [
      selectedFolder,
      lastFolder,
      onBackToCategories,
      dragX,
      handleBackFromFolder,
      handleOpenFolder,
    ],
  );

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  const handleOpenGift = async (gift: GiftIdea): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenedGift(gift);
  };

  if (giftsQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (giftsQuery.isError) {
    return (
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
    );
  }

  const openedIsMine = openedGift?.author_id === currentUser?.id;

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[styles.container, swipeAnimatedStyle]}>
        {selectedFolder === null ? (
          <View style={styles.stepTwoContainer}>
            {onBackToCategories ? (
              <View style={styles.stepTwoHeader}>
                <Pressable
                  style={styles.backPill}
                  onPress={onBackToCategories}
                >
                  <ChevronLeft
                    size={16}
                    color={colors.textPrimary}
                    strokeWidth={2}
                  />
                  <Text style={styles.backPillText}>
                    {t('ideas.backToCategories')}
                  </Text>
                </Pressable>
                <Text style={styles.stepTwoTitleCentered} numberOfLines={1}>
                  {t('ideas.wishlistAppTitle')}
                </Text>
              </View>
            ) : null}

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.folderGrid}>
              <View style={styles.folderCell}>
                <Pressable
                  style={({ pressed }) => [
                    styles.folderSquare,
                    { backgroundColor: '#FCEEF3' },
                    pressed && styles.tilePressed,
                  ]}
                  onPress={() => {
                    void handleOpenFolder('partner');
                  }}
                >
                  <View style={styles.folderIconBubble}>
                    <Heart size={24} color={colors.primary} strokeWidth={1.8} />
                  </View>
                  <View style={styles.folderMeta}>
                    <Text style={styles.folderTitle} numberOfLines={2}>
                      {t('ideas.partnerWishlist')}
                    </Text>
                    <Text style={styles.folderCount}>
                      {t('ideas.ideasCount', { count: partnerGifts.length })}
                    </Text>
                  </View>
                </Pressable>
              </View>

              <View style={styles.folderCell}>
                <Pressable
                  style={({ pressed }) => [
                    styles.folderSquare,
                    { backgroundColor: '#F2EDFD' },
                    pressed && styles.tilePressed,
                  ]}
                  onPress={() => {
                    void handleOpenFolder('mine');
                  }}
                >
                  <View style={styles.folderIconBubble}>
                    <Gift
                      size={24}
                      color={colors.secondary}
                      strokeWidth={1.8}
                    />
                  </View>
                  <View style={styles.folderMeta}>
                    <Text style={styles.folderTitle} numberOfLines={2}>
                      {t('ideas.myWishlist')}
                    </Text>
                    <Text style={styles.folderCount}>
                      {t('ideas.ideasCount', { count: myGifts.length })}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.stepTwoContainer}>
          <View style={styles.stepTwoHeader}>
            <Pressable
              style={styles.backPill}
              onPress={handleBackFromFolder}
            >
              <ChevronLeft size={16} color={colors.textPrimary} strokeWidth={2} />
              <Text style={styles.backPillText}>
                {t('ideas.wishlistAppTitle')}
              </Text>
            </Pressable>

            <Text style={styles.stepTwoTitleCentered} numberOfLines={1}>
              {selectedFolder === 'partner'
                ? t('ideas.partnerWishlist')
                : t('ideas.myWishlist')}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {activeGifts.length === 0 ? (
              <Text style={styles.emptyText}>No gift ideas here yet.</Text>
            ) : (
              <View style={styles.giftGrid}>
                {activeGifts.map((gift, index) => {
                  const isMine = gift.author_id === currentUser?.id;
                  const tint =
                    !isMine && gift.is_purchased
                      ? '#EAFBF3'
                      : !isMine && gift.is_reserved_by_partner
                        ? '#F2EDFD'
                        : GIFT_TINTS[index % GIFT_TINTS.length];
                  const iconColor =
                    !isMine && gift.is_purchased
                      ? colors.success
                      : !isMine && gift.is_reserved_by_partner
                        ? colors.secondary
                        : colors.primary;

                  return (
                    <View key={gift.id} style={styles.giftCell}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.giftSquare,
                          { backgroundColor: tint },
                          pressed && styles.tilePressed,
                        ]}
                        onPress={() => {
                          void handleOpenGift(gift);
                        }}
                      >
                        <View style={styles.giftTopRow}>
                          {!isMine && gift.is_purchased ? (
                            <CheckCircle2
                              size={16}
                              color={iconColor}
                              strokeWidth={1.9}
                            />
                          ) : !isMine && gift.is_reserved_by_partner ? (
                            <Lock
                              size={16}
                              color={iconColor}
                              strokeWidth={1.9}
                            />
                          ) : (
                            <ShoppingBag
                              size={16}
                              color={iconColor}
                              strokeWidth={1.9}
                            />
                          )}

                          {gift.price_estimate !== null ? (
                            <Text style={styles.giftPriceMini}>
                              ${Number(gift.price_estimate).toFixed(0)}
                            </Text>
                          ) : null}
                        </View>

                        <Text style={styles.giftSquareTitle} numberOfLines={3}>
                          {gift.title}
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

      <ExpandablePlusFab
        actions={[
          {
            key: 'add-gift',
            label: t('ideas.addGift'),
            icon: 'idea',
            onPress: () => setFormModalVisible(true),
          },
        ]}
      />

      <AppLaunchModal
        visible={Boolean(openedGift)}
        accentColor={colors.primary}
        onClose={() => setOpenedGift(null)}
      >
        {openedGift ? (
          <>
            <View style={styles.popupHeader}>
              <View style={styles.popupGiftIcon}>
                <Gift size={22} color={colors.primary} strokeWidth={1.9} />
              </View>
              <View style={styles.popupHeaderMeta}>
                <Text style={styles.popupTitle}>{openedGift.title}</Text>
                <Text style={styles.starsText}>
                  Priority {openedGift.priority} / 5
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
              <ExternalLink size={15} color={colors.white} />
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
                <Trash2 size={15} color={colors.danger} />
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
      </Animated.View>
    </GestureDetector>
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
  scrollContent: {
    paddingBottom: 82,
  },
  folderGrid: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  folderCell: {
    width: '50%',
    padding: 4,
  },
  folderSquare: {
    aspectRatio: 1.05,
    borderRadius: 22,
    padding: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  folderIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderMeta: {
    gap: 2,
  },
  folderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  folderCount: {
    fontSize: 12,
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
    paddingVertical: 4,
    minHeight: 36,
    position: 'relative',
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
    zIndex: 2,
  },
  backPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepTwoTitleCentered: {
    position: 'absolute',
    left: 96,
    right: 96,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  giftCell: {
    width: '33.3333%',
    padding: 4,
  },
  giftSquare: {
    aspectRatio: 1,
    borderRadius: 18,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  giftTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  giftPriceMini: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  giftSquareTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 15,
  },
  popupHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  popupGiftIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupHeaderMeta: {
    flex: 1,
    gap: 2,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  starsText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 15,
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
    fontWeight: '700',
    fontSize: 14,
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
