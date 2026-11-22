import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HelpCircle, Pencil } from 'lucide-react-native';
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

import { cycleApi } from '@/api/endpoints';
import { AdaptiveCycleCalendar } from '@/components/cycle/AdaptiveCycleCalendar';
import { DailyObservationModal } from '@/components/cycle/DailyObservationModal';
import { PhaseInsightCard } from '@/components/cycle/PhaseInsightCard';
import { colors, radii, spacing } from '@/theme/colors';

export default function CycleScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [editPeriodOpen, setEditPeriodOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const cycleQuery = useQuery({
    queryKey: ['cycleStatus'],
    queryFn: () => cycleApi.getStatus(),
  });

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['cycleStatus'] });
    setRefreshing(false);
  };

  if (cycleQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (cycleQuery.isError || !cycleQuery.data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t('common.error')}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => {
            void cycleQuery.refetch();
          }}
        >
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const cycleStatus = cycleQuery.data;

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
      <View style={styles.headerRow}>
        <Pressable
          style={({ pressed }) => [
            styles.iconCircleBtn,
            pressed && styles.iconCircleBtnPressed,
          ]}
          onPress={() => setEditPeriodOpen(true)}
          hitSlop={8}
        >
          <Pencil size={17} color={colors.textPrimary} strokeWidth={1.9} />
        </Pressable>
        <Text style={styles.title}>{t('cycle.title')}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.iconCircleBtn,
            pressed && styles.iconCircleBtnPressed,
          ]}
          onPress={() => setLegendOpen(true)}
          hitSlop={8}
        >
          <HelpCircle size={20} color={colors.textPrimary} strokeWidth={1.9} />
        </Pressable>
      </View>

      <AdaptiveCycleCalendar
        cycleStatus={cycleStatus}
        legendOpen={legendOpen}
        onCloseLegend={() => setLegendOpen(false)}
        editPeriodOpen={editPeriodOpen}
        onCloseEditPeriod={() => setEditPeriodOpen(false)}
      />

      <Pressable
        style={({ pressed }) => [
          styles.editObsBtn,
          pressed && styles.editObsPressed,
        ]}
        onPress={() => setModalOpen(true)}
      >
        <Text style={styles.editObsText}>{t('cycle.editObservation')}</Text>
      </Pressable>

      <PhaseInsightCard cycleStatus={cycleStatus} />

      <DailyObservationModal
        visible={modalOpen}
        cycleStatus={cycleStatus}
        onClose={() => setModalOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  iconCircleBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
  editObsBtn: {
    backgroundColor: '#F1EDF8',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.14)',
  },
  editObsPressed: {
    opacity: 0.85,
  },
  editObsText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 14,
  },
});
