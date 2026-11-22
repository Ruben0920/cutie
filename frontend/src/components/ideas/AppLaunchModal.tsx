import { X } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, spacing } from '@/theme/colors';

interface AppLaunchModalProps {
  visible: boolean;
  accentColor: string;
  isMystery?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function AppLaunchModal({
  visible,
  accentColor,
  isMystery = false,
  onClose,
  children,
}: AppLaunchModalProps): React.JSX.Element {
  const scale = useSharedValue(0.84);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0.84;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 16, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 180 });
    }
  }, [visible, scale, opacity]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={styles.cardWrapper}
        >
          <Animated.View
            style={[
              styles.appWindow,
              isMystery && styles.mysteryWindow,
              { borderTopColor: accentColor },
              animatedCardStyle,
            ]}
          >
            <View style={styles.topBar}>
              <View style={styles.grabber} />
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            {children}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(19, 10, 24, 0.56)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 380,
  },
  appWindow: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xl,
    borderTopWidth: 5,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  mysteryWindow: {
    backgroundColor: '#F6F0FF',
    borderWidth: 1.5,
    borderColor: colors.accentGold,
    borderTopWidth: 5,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xs,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
});
