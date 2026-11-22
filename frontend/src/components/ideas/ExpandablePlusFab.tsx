import * as Haptics from 'expo-haptics';
import { FolderPlus, Lightbulb, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, spacing } from '@/theme/colors';

export interface FabActionItem {
  key: string;
  label: string;
  icon: 'category' | 'idea';
  onPress: () => void;
}

interface ExpandablePlusFabProps {
  actions: FabActionItem[];
}

export function ExpandablePlusFab({
  actions,
}: ExpandablePlusFabProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  const rotateDeg = useSharedValue(0);
  const menuScale = useSharedValue(0.85);
  const menuOpacity = useSharedValue(0);

  useEffect(() => {
    setExpanded(false);
  }, [actions.length]);

  useEffect(() => {
    rotateDeg.value = withSpring(expanded ? 45 : 0, {
      damping: 16,
      stiffness: 220,
    });
    menuScale.value = withSpring(expanded ? 1 : 0.85, {
      damping: 18,
      stiffness: 240,
    });
    menuOpacity.value = withTiming(expanded ? 1 : 0, { duration: 140 });
  }, [expanded, rotateDeg, menuScale, menuOpacity]);

  const plusAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateDeg.value}deg` }],
  }));

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
    opacity: menuOpacity.value,
  }));

  const handleMainPress = async (): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (actions.length === 1) {
      actions[0].onPress();
      return;
    }
    setExpanded((prev) => !prev);
  };

  const handleSelectAction = async (action: FabActionItem): Promise<void> => {
    await Haptics.selectionAsync();
    setExpanded(false);
    action.onPress();
  };

  return (
    <>
      {expanded ? (
        <Pressable
          style={styles.backdrop}
          onPress={() => setExpanded(false)}
        />
      ) : null}

      <View style={styles.anchor} pointerEvents="box-none">
        {expanded ? (
          <Animated.View style={[styles.menuColumn, menuAnimatedStyle]}>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                style={({ pressed }) => [
                  styles.menuPill,
                  pressed && styles.menuPillPressed,
                ]}
                onPress={() => {
                  void handleSelectAction(action);
                }}
              >
                <View style={styles.menuIconWrap}>
                  {action.icon === 'category' ? (
                    <FolderPlus
                      size={16}
                      color={colors.primary}
                      strokeWidth={2}
                    />
                  ) : (
                    <Lightbulb
                      size={16}
                      color={colors.secondary}
                      strokeWidth={2}
                    />
                  )}
                </View>
                <Text style={styles.menuLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.fabCircle,
            pressed && styles.fabPressed,
          ]}
          onPress={() => {
            void handleMainPress();
          }}
        >
          <Animated.View style={plusAnimatedStyle}>
            <Plus size={24} color={colors.white} strokeWidth={2.3} />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(18, 12, 22, 0.22)',
    zIndex: 20,
  },
  anchor: {
    position: 'absolute',
    right: 4,
    bottom: 16,
    alignItems: 'flex-end',
    gap: spacing.sm,
    zIndex: 30,
  },
  menuColumn: {
    alignItems: 'flex-end',
    gap: spacing.xs + 2,
  },
  menuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  menuPillPressed: {
    transform: [{ scale: 0.96 }],
  },
  menuIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fabCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
});
