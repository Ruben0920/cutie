import { X } from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, spacing } from '@/theme/colors';

interface BottomSheetModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  scrollable?: boolean;
  children: React.ReactNode;
}

export function BottomSheetModal({
  visible,
  title,
  onClose,
  scrollable = false,
  children,
}: BottomSheetModalProps): React.JSX.Element {
  const translateY = useSharedValue(180);

  useEffect(() => {
    if (visible) {
      translateY.value = 180;
      translateY.value = withTiming(0, {
        duration: 210,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [visible, translateY]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <Animated.View style={[styles.sheetCard, cardAnimatedStyle]}>
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <X size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {scrollable ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}
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
    maxHeight: '78%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
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
    paddingHorizontal: spacing.xl,
    paddingVertical: 8,
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingTop: 6,
    paddingBottom: 36,
    gap: spacing.md,
  },
});
