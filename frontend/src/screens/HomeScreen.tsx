import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { coupleApi } from '@/api/endpoints';
import { ActiveEveningScenarioBanner } from '@/components/dashboard/ActiveEveningScenarioBanner';
import { CountdownBanner } from '@/components/dashboard/CountdownBanner';
import { PartnerStatusCard } from '@/components/dashboard/PartnerStatusCard';
import { QuickStatusGrid } from '@/components/dashboard/QuickStatusGrid';
import { SurpriseRequestModal } from '@/components/dashboard/SurpriseRequestModal';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radii, spacing } from '@/theme/colors';

export default function HomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ['coupleDashboard'],
    queryFn: coupleApi.getDashboard,
  });

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['cycleStatus'] }),
    ]);
    setRefreshing(false);
  };

  if (dashboardQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data || !currentUser) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => {
            void dashboardQuery.refetch();
          }}
        >
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const dashboard = dashboardQuery.data;
  const me =
    dashboard.partners.find((p) => p.id === currentUser.id) ?? currentUser;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void handleRefresh();
          }}
          tintColor={colors.primary}
        />
      }
    >
      <CountdownBanner dashboard={dashboard} />

      <ActiveEveningScenarioBanner
        scenario={dashboard.active_evening_scenario}
        currentUserId={me.id}
      />

      <PartnerStatusCard
        partners={dashboard.partners}
        currentUserId={me.id}
      />

      <QuickStatusGrid currentStatus={me.current_status} />

      <SurpriseRequestModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: 58,
    paddingBottom: 32,
    gap: spacing.lg,
  },
});
