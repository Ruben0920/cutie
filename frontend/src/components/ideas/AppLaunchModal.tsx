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
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0.9;
      opacity.value = 0;
      scale.value = withSpring(1, { damping: 20, stiffness: 260 });
      opacity.value = withTiming(1, { duration: 160 });
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
              animatedCardStyle,
            ]}
          >
            <View style={styles.topRow}>
              <View
                style={[styles.accentLine, { backgroundColor: accentColor }]}
              />
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <X size={16} color={colors.textSecondary} strokeWidth={2} />
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
    backgroundColor: 'rgba(18, 12, 22, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 360,
  },
  appWindow: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  mysteryWindow: {
    backgroundColor: '#FAF7FF',
    borderColor: '#E3D5FA',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accentLine: {
    width: 32,
    height: 4,
    borderRadius: radii.pill,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
