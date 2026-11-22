import { Dices } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii } from '@/theme/colors';

interface AnimatedDiceCubeProps {
  isRolling: boolean;
  onPress: () => void;
}

export function AnimatedDiceCube({
  isRolling,
  onPress,
}: AnimatedDiceCubeProps): React.JSX.Element {
  const spinProgress = useSharedValue(0);
  const scaleProgress = useSharedValue(1);

  useEffect(() => {
    if (isRolling) {
      spinProgress.value = 0;
      spinProgress.value = withTiming(1, { duration: 1150 });
      scaleProgress.value = withSequence(
        withTiming(1.18, { duration: 280 }),
        withTiming(0.92, { duration: 280 }),
        withTiming(1.12, { duration: 280 }),
        withSpring(1, { damping: 10, stiffness: 160 }),
      );
    }
  }, [isRolling, spinProgress, scaleProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotateDeg = interpolate(spinProgress.value, [0, 1], [0, 720]);
    const translateY = interpolate(
      spinProgress.value,
      [0, 0.25, 0.5, 0.75, 1],
      [0, -24, 6, -14, 0],
    );

    return {
      transform: [
        { translateY },
        { rotate: `${rotateDeg}deg` },
        { scale: scaleProgress.value },
      ],
    };
  });

  return (
    <Pressable onPress={onPress} disabled={isRolling} style={styles.touchArea}>
      <Animated.View style={[styles.cube, animatedStyle]}>
        <View style={styles.innerGlow}>
          <Dices size={80} color={colors.white} strokeWidth={1.75} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  cube: {
    width: 184,
    height: 184,
    borderRadius: radii.xl + 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 10,
  },
  innerGlow: {
    width: 154,
    height: 154,
    borderRadius: radii.xl + 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
