import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Gift, Sparkles, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getWebSocketUrl } from '@/api/client';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radii, spacing } from '@/theme/colors';
import type { RealtimeWsEvent } from '@/types/api';

interface ToastMessage {
  title: string;
  body: string;
}

export function RealtimeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const setWsConnected = useAuthStore((s) => s.setWsConnected);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [surpriseEvent, setSurpriseEvent] = useState<RealtimeWsEvent | null>(
    null,
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef<number>(1000);

  useEffect(() => {
    let isCancelled = false;

    const showToast = (title: string, body: string): void => {
      setToast({ title, body });
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
      }, 4500);
    };

    const connect = (): void => {
      if (isCancelled || !token) return;

      const ws = new WebSocket(getWebSocketUrl(token));
      wsRef.current = ws;

      let heartbeat: ReturnType<typeof setInterval> | null = null;

      ws.onopen = () => {
        retryDelayRef.current = 1000;
        setWsConnected(true);
        heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as RealtimeWsEvent;
          if (parsed.event_type === 'PONG') return;

          if (parsed.event_type === 'PARTNER_STATUS_UPDATED') {
            void queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            showToast(
              parsed.title || 'Partner Update',
              parsed.body || '',
            );
          } else if (parsed.event_type === 'EVENING_SCENARIO_LOCKED') {
            void queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            showToast(
              parsed.title || "Tonight's Plan",
              parsed.body || '',
            );
          } else if (parsed.event_type === 'SURPRISE_REQUESTED') {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            );
            setSurpriseEvent(parsed);
          } else if (parsed.event_type === 'CYCLE_UPDATED') {
            void queryClient.invalidateQueries({ queryKey: ['cycleStatus'] });
          }
        } catch {
          // Ignore malformed WS payloads
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        if (heartbeat) clearInterval(heartbeat);
        setWsConnected(false);
        if (!isCancelled && token) {
          const delay = retryDelayRef.current;
          retryDelayRef.current = Math.min(delay * 2, 30000);
          reconnectTimerRef.current = setTimeout(connect, delay);
        }
      };
    };

    if (token) {
      connect();
    } else {
      setWsConnected(false);
    }

    return () => {
      isCancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
    };
  }, [token, queryClient, setWsConnected]);

  const suggested = surpriseEvent?.payload?.suggested_idea;

  return (
    <>
      {children}

      {toast ? (
        <Pressable style={styles.toastBanner} onPress={() => setToast(null)}>
          <Sparkles size={18} color={colors.white} />
          <View style={styles.toastTextWrap}>
            <Text style={styles.toastTitle}>{toast.title}</Text>
            {toast.body ? (
              <Text style={styles.toastBody}>{toast.body}</Text>
            ) : null}
          </View>
          <X size={16} color={colors.white} />
        </Pressable>
      ) : null}

      <Modal
        visible={Boolean(surpriseEvent)}
        transparent
        animationType="fade"
        onRequestClose={() => setSurpriseEvent(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Gift size={28} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>
              {surpriseEvent?.title || 'Surprise Requested!'}
            </Text>
            <Text style={styles.modalBody}>{surpriseEvent?.body}</Text>

            {suggested ? (
              <View style={styles.suggestionBox}>
                <Text style={styles.suggestionLabel}>
                  {suggested.suggestion_type === 'gift'
                    ? '🎁 Secret Wishlist Pick'
                    : '💑 Romantic Date Idea'}
                </Text>
                <Text style={styles.suggestionTitle}>{suggested.title}</Text>
                {suggested.direct_url ? (
                  <Pressable
                    style={styles.linkButton}
                    onPress={() => {
                      if (suggested.direct_url) {
                        void Linking.openURL(suggested.direct_url);
                      }
                    }}
                  >
                    <Text style={styles.linkButtonText}>Open Gift Link</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Pressable
              style={styles.closeModalButton}
              onPress={() => setSurpriseEvent(null)}
            >
              <Text style={styles.closeModalText}>Got it!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toastBanner: {
    position: 'absolute',
    top: 54,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.textPrimary,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 1000,
  },
  toastTextWrap: {
    flex: 1,
    gap: 2,
  },
  toastTitle: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  toastBody: {
    color: '#E5DCE9',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 24, 0.55)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  suggestionBox: {
    width: '100%',
    backgroundColor: colors.accentGoldSoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentGold,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  linkButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.accentGold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  linkButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  closeModalButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  closeModalText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
