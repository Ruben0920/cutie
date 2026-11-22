import { Dices } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
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
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  useEffect(() => {
    if (!isRolling) return;

    rotateZ.value = 0;
    rotateX.value = 0;
    rotateY.value = 0;

    // 1. Pull down toward bottom of screen -> 2. Throw upward -> 3. Fall & bounce to stop
    translateY.value = withSequence(
      withTiming(240, { duration: 150, easing: Easing.in(Easing.quad) }),
      withTiming(-92, { duration: 340, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }),
      withTiming(-26, { duration: 130, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 120, easing: Easing.in(Easing.quad) }),
      withTiming(-8, { duration: 85, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 85, easing: Easing.in(Easing.quad) }),
    );

    scale.value = withSequence(
      withTiming(0.72, { duration: 150, easing: Easing.in(Easing.quad) }),
      withTiming(1.18, { duration: 340, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 240, easing: Easing.in(Easing.quad) }),
      withTiming(0.94, { duration: 60, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    );

    rotateZ.value = withSequence(
      withTiming(-28, { duration: 150, easing: Easing.in(Easing.quad) }),
      withTiming(720, { duration: 990, easing: Easing.out(Easing.cubic) }),
    );

    rotateX.value = withSequence(
      withTiming(-24, { duration: 150, easing: Easing.in(Easing.quad) }),
      withTiming(384, { duration: 580, easing: Easing.out(Easing.cubic) }),
      withSpring(360, { damping: 14, stiffness: 150 }),
    );

    rotateY.value = withSequence(
      withTiming(20, { duration: 150, easing: Easing.in(Easing.quad) }),
      withTiming(342, { duration: 580, easing: Easing.out(Easing.cubic) }),
      withSpring(360, { damping: 14, stiffness: 150 }),
    );
  }, [isRolling, translateY, scale, rotateZ, rotateX, rotateY]);

  const cubeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateY: translateY.value },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { rotateZ: `${rotateZ.value}deg` },
      { scale: scale.value },
    ],
  }));

  const shadowAnimatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(translateY.value);
    const shadowScale = interpolate(distance, [0, 92, 240], [1, 0.58, 0.35], 'clamp');
    const shadowOpacity = interpolate(distance, [0, 92, 240], [0.22, 0.08, 0.02], 'clamp');
    return {
      opacity: shadowOpacity,
      transform: [{ scaleX: shadowScale }, { scaleY: shadowScale }],
    };
  });

  return (
    <Pressable onPress={onPress} disabled={isRolling} style={styles.touchArea}>
      <Animated.View style={[styles.cube, cubeAnimatedStyle]}>
        <View style={styles.innerGlow}>
          <Dices size={80} color={colors.white} strokeWidth={1.75} />
        </View>
      </Animated.View>
      <Animated.View style={[styles.floorShadow, shadowAnimatedStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    overflow: 'visible',
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
  floorShadow: {
    width: 144,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1F1623',
    marginTop: 18,
  },
});
