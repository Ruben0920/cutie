import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  BatteryLow,
  Heart,
  Home,
  Laptop,
  Utensils,
  Zap,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { interactionsApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, spacing } from '@/theme/colors';
import type {
  CoupleDashboard,
  EnergyLevelEnum,
  QuickStatusEnum,
} from '@/types/api';

const STATUS_ENERGY_MAP: Record<QuickStatusEnum, EnergyLevelEnum> = {
  going_home: 'medium',
  high_energy: 'high',
  tired: 'low',
  hungry: 'medium',
  need_hugs: 'low',
  busy: 'low',
};

const STATUS_TILES: Array<{
  key: QuickStatusEnum;
  tint: string;
  accent: string;
}> = [
  { key: 'going_home', tint: '#EEF4FD', accent: '#2563EB' },
  { key: 'high_energy', tint: '#FEF3EA', accent: '#EA580C' },
  { key: 'tired', tint: '#F3EEFC', accent: '#7C3AED' },
  { key: 'hungry', tint: '#FEF7E6', accent: '#D97706' },
  { key: 'need_hugs', tint: '#FCEEF3', accent: '#DB2777' },
  { key: 'busy', tint: '#EEF1F4', accent: '#475569' },
];

function renderTileIcon(
  status: QuickStatusEnum,
  color: string,
): React.JSX.Element {
  const size = 20;
  switch (status) {
    case 'going_home':
      return <Home size={size} color={color} strokeWidth={1.8} />;
    case 'high_energy':
      return <Zap size={size} color={color} strokeWidth={1.8} />;
    case 'tired':
      return <BatteryLow size={size} color={color} strokeWidth={1.8} />;
    case 'hungry':
      return <Utensils size={size} color={color} strokeWidth={1.8} />;
    case 'need_hugs':
      return <Heart size={size} color={color} strokeWidth={1.8} />;
    case 'busy':
      return <Laptop size={size} color={color} strokeWidth={1.8} />;
  }
}

interface QuickStatusGridProps {
  currentStatus: QuickStatusEnum | null;
}

export function QuickStatusGrid({
  currentStatus,
}: QuickStatusGridProps): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [optimisticStatus, setOptimisticStatus] =
    useState<QuickStatusEnum | null>(null);

  const statusMutation = useMutation({
    mutationFn: interactionsApi.updateStatus,
    onMutate: async (nextStatus) => {
      await queryClient.cancelQueries({ queryKey: ['coupleDashboard'] });
      const previousDashboard = queryClient.getQueryData<CoupleDashboard>([
        'coupleDashboard',
      ]);
      if (previousDashboard && currentUserId) {
        const nextEnergy = STATUS_ENERGY_MAP[nextStatus];
        queryClient.setQueryData<CoupleDashboard>(['coupleDashboard'], {
          ...previousDashboard,
          partners: previousDashboard.partners.map((partner) =>
            partner.id === currentUserId
              ? {
                  ...partner,
                  current_status: nextStatus,
                  current_energy_modifier: nextEnergy,
                }
              : partner,
          ),
        });
      }
      return { previousDashboard, submittedStatus: nextStatus };
    },
    onSuccess: (res) => {
      const currentDashboard = queryClient.getQueryData<CoupleDashboard>([
        'coupleDashboard',
      ]);
      if (currentDashboard) {
        queryClient.setQueryData<CoupleDashboard>(['coupleDashboard'], {
          ...currentDashboard,
          partners: currentDashboard.partners.map((partner) =>
            partner.id === res.user.id ? res.user : partner,
          ),
        });
      }
      void updateUser(res.user);
    },
    onError: (_err, _nextStatus, context) => {
      if (context?.previousDashboard) {
        queryClient.setQueryData<CoupleDashboard>(
          ['coupleDashboard'],
          context.previousDashboard,
        );
      }
      setOptimisticStatus((prev) =>
        prev === context?.submittedStatus ? null : prev,
      );
    },
    onSettled: (_data, _err, submittedStatus) => {
      setOptimisticStatus((prev) => (prev === submittedStatus ? null : prev));
    },
  });

  const activeStatus = optimisticStatus ?? currentStatus;

  const handlePress = (status: QuickStatusEnum): void => {
    if (activeStatus === status) return;
    setOptimisticStatus(status);
    void Haptics.selectionAsync();
    statusMutation.mutate(status);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.quickStatusTitle')}</Text>
      <View style={styles.grid}>
        {STATUS_TILES.map((tile) => {
          const active = activeStatus === tile.key;
          return (
            <View key={tile.key} style={styles.cell}>
              <Pressable
                style={({ pressed }) => [
                  styles.square,
                  { backgroundColor: active ? colors.white : tile.tint },
                  active && {
                    borderColor: tile.accent,
                    shadowColor: tile.accent,
                    shadowOpacity: 0.14,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 2,
                  },
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  handlePress(tile.key);
                }}
              >
                <View
                  style={[
                    styles.iconBubble,
                    active
                      ? { backgroundColor: tile.accent }
                      : { backgroundColor: 'rgba(255,255,255,0.82)' },
                  ]}
                >
                  {renderTileIcon(
                    tile.key,
                    active ? colors.white : tile.accent,
                  )}
                </View>

                <Text
                  style={[
                    styles.squareLabel,
                    active && { color: tile.accent },
                  ]}
                  numberOfLines={2}
                >
                  {t(`statuses.${tile.key}`)}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  cell: {
    width: '33.3333%',
    padding: 4,
  },
  square: {
    aspectRatio: 1,
    borderRadius: 20,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 16,
  },
});
