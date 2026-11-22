import * as Haptics from 'expo-haptics';
import { MessageCircle } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoupleChatModal } from '@/components/chat/CoupleChatModal';
import { useChatStore } from '@/store/useChatStore';
import { colors } from '@/theme/colors';

const FAB_SIZE = 54;
const EDGE_MARGIN = 14;

export function FloatingChatHead(): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const unreadCount = useChatStore((s) => s.unreadCount);
  const setOpen = useChatStore((s) => s.setOpen);

  const minX = EDGE_MARGIN;
  const maxX = Math.max(EDGE_MARGIN, width - FAB_SIZE - EDGE_MARGIN);
  const minY = Math.max(insets.top + 10, 56);
  const maxY = Math.max(minY + 40, height - insets.bottom - FAB_SIZE - 80);

  const translateX = useSharedValue(maxX);
  const translateY = useSharedValue(Math.min(maxY, Math.round(height * 0.56)));
  const startX = useSharedValue(maxX);
  const startY = useSharedValue(Math.min(maxY, Math.round(height * 0.56)));
  const pressedScale = useSharedValue(1);

  useEffect(() => {
    // Re-clamp inside current viewport if screen size changes
    if (translateX.value > maxX) translateX.value = maxX;
    if (translateY.value > maxY) translateY.value = maxY;
    if (translateY.value < minY) translateY.value = minY;
  }, [maxX, maxY, minY, translateX, translateY]);

  const handleOpenChat = (): void => {
    void Haptics.selectionAsync();
    setOpen(true);
  };

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      pressedScale.value = withSpring(1.08);
    })
    .onUpdate((e) => {
      const nextX = Math.max(6, Math.min(width - FAB_SIZE - 6, startX.value + e.translationX));
      const nextY = Math.max(minY, Math.min(maxY, startY.value + e.translationY));
      translateX.value = nextX;
      translateY.value = nextY;
    })
    .onEnd((e) => {
      pressedScale.value = withSpring(1);
      const projectedCenter =
        translateX.value + FAB_SIZE / 2 + e.velocityX * 0.08;
      const snapLeft = projectedCenter < width / 2;
      translateX.value = withSpring(snapLeft ? minX : maxX, {
        damping: 18,
        stiffness: 220,
      });
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .runOnJS(true)
    .onEnd((_e, success) => {
      if (success) {
        handleOpenChat();
      }
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: pressedScale.value },
    ],
  }));

  return (
    <>
      <View pointerEvents="box-none" style={styles.overlayLayer}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.fab, animatedStyle]}>
            <View style={styles.innerRing}>
              <MessageCircle
                size={24}
                color={colors.white}
                strokeWidth={2.1}
              />
            </View>

            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </View>

      <CoupleChatModal />
    </>
  );
}

const styles = StyleSheet.create({
  overlayLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    elevation: 999,
  },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 12,
  },
  innerRing: {
    width: FAB_SIZE - 8,
    height: FAB_SIZE - 8,
    borderRadius: (FAB_SIZE - 8) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
  },
});
