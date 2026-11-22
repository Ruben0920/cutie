import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { MessageCircle, Send, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { chatApi, coupleApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { colors, spacing } from '@/theme/colors';
import type { ChatHistoryResponse, ChatMessage } from '@/types/api';

function formatMessageTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CoupleChatModal(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const currentUserName = useAuthStore((s) => s.user?.name ?? 'You');

  const isOpen = useChatStore((s) => s.isOpen);
  const setOpen = useChatStore((s) => s.setOpen);
  const setUnreadCount = useChatStore((s) => s.setUnreadCount);

  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage> | null>(null);
  const translateY = useSharedValue(220);

  const dashboardQuery = useQuery({
    queryKey: ['coupleDashboard'],
    queryFn: coupleApi.getDashboard,
  });

  const chatQuery = useQuery({
    queryKey: ['chatMessages'],
    queryFn: chatApi.listMessages,
    enabled: Boolean(currentUserId),
    refetchInterval: isOpen ? 5000 : 20000,
  });

  useEffect(() => {
    if (chatQuery.data && !isOpen) {
      setUnreadCount(chatQuery.data.unread_count);
    }
  }, [chatQuery.data, isOpen, setUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      translateY.value = 220;
      translateY.value = withTiming(0, {
        duration: 210,
        easing: Easing.out(Easing.cubic),
      });
      setUnreadCount(0);
      void chatApi.markRead().then(() => {
        void queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      });
    }
  }, [isOpen, translateY, setUnreadCount, queryClient]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const sendMutation = useMutation({
    mutationFn: chatApi.sendMessage,
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: ['chatMessages'] });
      const prev = queryClient.getQueryData<ChatHistoryResponse>([
        'chatMessages',
      ]);
      const optimisticMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        couple_id: 'local',
        sender_id: currentUserId ?? 'me',
        sender_name: currentUserName,
        body: text,
        read_at: null,
        created_at: new Date().toISOString(),
      };
      if (prev) {
        queryClient.setQueryData<ChatHistoryResponse>(['chatMessages'], {
          ...prev,
          messages: [...prev.messages, optimisticMsg],
        });
      }
      return { prev };
    },
    onSuccess: (created) => {
      const current = queryClient.getQueryData<ChatHistoryResponse>([
        'chatMessages',
      ]);
      if (current) {
        const cleaned = current.messages.filter(
          (m) => !m.id.startsWith('temp-') && m.id !== created.id,
        );
        queryClient.setQueryData<ChatHistoryResponse>(['chatMessages'], {
          ...current,
          messages: [...cleaned, created],
        });
      }
      void Haptics.selectionAsync();
    },
    onError: (_err, _text, context) => {
      if (context?.prev) {
        queryClient.setQueryData<ChatHistoryResponse>(
          ['chatMessages'],
          context.prev,
        );
      }
    },
  });

  const handleSend = (): void => {
    const trimmed = draft.trim();
    if (!trimmed || sendMutation.isPending) return;
    setDraft('');
    sendMutation.mutate(trimmed);
  };

  const partner = dashboardQuery.data?.partners.find(
    (p) => p.id !== currentUserId,
  );
  const messages = chatQuery.data?.messages ?? [];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setOpen(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable
          style={styles.backdropDismiss}
          onPress={() => setOpen(false)}
        />
        <Animated.View style={[styles.sheetCard, cardAnimatedStyle]}>
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerBadge}>
                <MessageCircle size={17} color="#2563EB" strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.title}>
                  {partner ? partner.name : t('chat.title')}
                </Text>
                <Text style={styles.subtitle}>{t('chat.title')}</Text>
              </View>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={() => setOpen(false)}
              hitSlop={12}
            >
              <X size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {chatQuery.isLoading && messages.length === 0 ? (
            <View style={styles.centeredBody}>
              <ActivityIndicator color="#2563EB" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.centeredBody}>
              <Text style={styles.emptyTitle}>{t('chat.emptyTitle')}</Text>
              <Text style={styles.emptySubtitle}>{t('chat.emptySubtitle')}</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                listRef.current?.scrollToEnd({ animated: true });
              }}
              onLayout={() => {
                listRef.current?.scrollToEnd({ animated: false });
              }}
              renderItem={({ item }) => {
                const isMine = item.sender_id === currentUserId;
                return (
                  <View
                    style={[
                      styles.msgRow,
                      isMine ? styles.msgRowMine : styles.msgRowPartner,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        isMine ? styles.bubbleMine : styles.bubblePartner,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
                          isMine
                            ? styles.bubbleTextMine
                            : styles.bubbleTextPartner,
                        ]}
                      >
                        {item.body}
                      </Text>
                      <Text
                        style={[
                          styles.timeText,
                          isMine ? styles.timeTextMine : styles.timeTextPartner,
                        ]}
                      >
                        {formatMessageTime(item.created_at)}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          <View style={styles.composerRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              style={styles.input}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                !draft.trim() && styles.sendBtnDisabled,
                pressed && draft.trim() ? styles.sendBtnPressed : undefined,
              ]}
              onPress={handleSend}
              disabled={!draft.trim() || sendMutation.isPending}
            >
              <Send size={18} color={colors.white} strokeWidth={2} />
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,15,24,0.44)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheetCard: {
    height: '78%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 18,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.14)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 8,
  },
  msgRow: {
    flexDirection: 'row',
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  msgRowPartner: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 3,
  },
  bubbleMine: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 6,
  },
  bubblePartner: {
    backgroundColor: '#F3F1F6',
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  bubbleTextPartner: {
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 10.5,
    alignSelf: 'flex-end',
  },
  timeTextMine: {
    color: 'rgba(255,255,255,0.72)',
  },
  timeTextPartner: {
    color: colors.textMuted,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    backgroundColor: '#F4F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendBtnPressed: {
    transform: [{ scale: 0.94 }],
  },
});
