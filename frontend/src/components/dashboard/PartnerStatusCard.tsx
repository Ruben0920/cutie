import {
  BatteryLow,
  Heart,
  Home,
  Laptop,
  Utensils,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/store/useAuthStore';
import { colors, energyColors, radii, spacing } from '@/theme/colors';
import type { QuickStatusEnum, UserProfile } from '@/types/api';

interface PartnerStatusCardProps {
  partners: UserProfile[];
  currentUserId: string;
}

function formatRelativeMinutes(isoDate: string | null): string {
  if (!isoDate) return '';
  const diffMin = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000),
  );
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const hrs = Math.floor(diffMin / 60);
  return `${hrs}h ago`;
}

function renderStatusIcon(status: QuickStatusEnum): React.JSX.Element {
  const color = colors.textSecondary;
  const size = 13;
  switch (status) {
    case 'going_home':
      return <Home size={size} color={color} strokeWidth={1.9} />;
    case 'high_energy':
      return <Zap size={size} color={color} strokeWidth={1.9} />;
    case 'tired':
      return <BatteryLow size={size} color={color} strokeWidth={1.9} />;
    case 'hungry':
      return <Utensils size={size} color={color} strokeWidth={1.9} />;
    case 'need_hugs':
      return <Heart size={size} color={color} strokeWidth={1.9} />;
    case 'busy':
      return <Laptop size={size} color={color} strokeWidth={1.9} />;
  }
}

export function PartnerStatusCard({
  partners,
  currentUserId,
}: PartnerStatusCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const isWsConnected = useAuthStore((s) => s.isWsConnected);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{t('home.partnerStatusTitle')}</Text>
        <View style={styles.syncPill}>
          <View
            style={[
              styles.syncDot,
              {
                backgroundColor: isWsConnected
                  ? colors.success
                  : colors.textMuted,
              },
            ]}
          />
          <Text style={styles.syncText}>
            {isWsConnected ? t('common.online') : t('common.offline')}
          </Text>
        </View>
      </View>

      <View style={styles.partnerList}>
        {partners.map((partner) => {
          const isMe = partner.id === currentUserId;
          const energyStyle = energyColors[partner.current_energy_modifier];
          return (
            <View key={partner.id} style={styles.partnerRow}>
              <View
                style={[
                  styles.avatar,
                  !isMe && styles.partnerAvatar,
                ]}
              >
                <Text
                  style={[
                    styles.avatarText,
                    !isMe && styles.partnerAvatarText,
                  ]}
                >
                  {partner.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.partnerMeta}>
                <View style={styles.nameRow}>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  <View
                    style={[
                      styles.energyBadge,
                      { backgroundColor: energyStyle.soft },
                    ]}
                  >
                    <Text
                      style={[styles.energyText, { color: energyStyle.main }]}
                    >
                      {t(`energy.${partner.current_energy_modifier}`)}
                    </Text>
                  </View>
                </View>

                {partner.current_status ? (
                  <View style={styles.statusRow}>
                    {renderStatusIcon(partner.current_status)}
                    <Text style={styles.statusText}>
                      {t(`statuses.${partner.current_status}`)}
                    </Text>
                    <Text style={styles.timeText}>
                      • {formatRelativeMinutes(partner.current_status_updated_at)}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.timeText}>—</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  partnerList: {
    gap: spacing.md,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FCEEF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatar: {
    backgroundColor: '#F2EDFD',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  partnerAvatarText: {
    color: colors.secondary,
  },
  partnerMeta: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  energyBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  energyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
