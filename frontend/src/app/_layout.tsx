import '@/i18n';

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { coupleApi } from '@/api/endpoints';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { RealtimeProvider } from '@/providers/RealtimeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radii, spacing } from '@/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
    },
  },
});

function AuthNavigationGuard({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const segments = useSegments();

  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hasSkippedPairing = useAuthStore((s) => s.hasSkippedPairing);
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  usePushNotifications();

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  const dashboardQuery = useQuery({
    queryKey: ['coupleDashboard'],
    queryFn: coupleApi.getDashboard,
    enabled: isHydrated && Boolean(token),
  });

  useEffect(() => {
    if (!isHydrated) return;

    const topSegment = segments[0] as string | undefined;
    const inAuthGroup = topSegment === '(auth)';
    const inOnboardingGroup = topSegment === '(onboarding)';

    if (!token) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (dashboardQuery.isLoading || !dashboardQuery.data) {
      return;
    }

    const partnerCount = dashboardQuery.data.partners.length;
    if (partnerCount < 2 && !hasSkippedPairing) {
      if (!inOnboardingGroup) {
        router.replace('/(onboarding)/pair');
      }
      return;
    }

    if (inAuthGroup || !topSegment) {
      router.replace('/(tabs)/home');
    }
  }, [
    isHydrated,
    token,
    segments,
    dashboardQuery.isLoading,
    dashboardQuery.data,
    hasSkippedPairing,
    router,
  ]);

  if (!isHydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (token && dashboardQuery.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Unable to connect to couple space</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            void dashboardQuery.refetch();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={styles.rootFlex}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <RealtimeProvider>
          <AuthNavigationGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </AuthNavigationGuard>
        </RealtimeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootFlex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
  },
});
