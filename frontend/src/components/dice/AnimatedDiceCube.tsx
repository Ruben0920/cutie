import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const CUBE_SIZE = 156;
const HALF = CUBE_SIZE / 2;
const DEG2RAD = Math.PI / 180;

const REST_RX = -22;
const REST_RY = 28;
const REST_RZ = 0;

type Vec3 = readonly [number, number, number];

interface FaceSpec {
  id: string;
  pips: number;
  u: Vec3;
  v: Vec3;
  n: Vec3;
}

const FACES: readonly FaceSpec[] = [
  { id: 'front', pips: 1, u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  { id: 'back', pips: 6, u: [-1, 0, 0], v: [0, 1, 0], n: [0, 0, -1] },
  { id: 'right', pips: 5, u: [0, 0, -1], v: [0, 1, 0], n: [1, 0, 0] },
  { id: 'left', pips: 2, u: [0, 0, 1], v: [0, 1, 0], n: [-1, 0, 0] },
  { id: 'top', pips: 3, u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] },
  { id: 'bottom', pips: 4, u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] },
];

// Normalized pip coordinates in [-1, 1] x [-1, 1]
const PIP_LAYOUTS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[0, 0]],
  2: [
    [-0.55, -0.55],
    [0.55, 0.55],
  ],
  3: [
    [-0.58, -0.58],
    [0, 0],
    [0.58, 0.58],
  ],
  4: [
    [-0.55, -0.55],
    [0.55, -0.55],
    [-0.55, 0.55],
    [0.55, 0.55],
  ],
  5: [
    [-0.58, -0.58],
    [0.58, -0.58],
    [0, 0],
    [-0.58, 0.58],
    [0.58, 0.58],
  ],
  6: [
    [-0.55, -0.62],
    [0.55, -0.62],
    [-0.55, 0],
    [0.55, 0],
    [-0.55, 0.62],
    [0.55, 0.62],
  ],
};

function rotateVec(
  vec: Vec3,
  cosX: number,
  sinX: number,
  cosY: number,
  sinY: number,
  cosZ: number,
  sinZ: number,
): Vec3 {
  'worklet';
  const [vx, vy, vz] = vec;
  // Ry
  const x1 = vx * cosY + vz * sinY;
  const y1 = vy;
  const z1 = -vx * sinY + vz * cosY;
  // Rx
  const x2 = x1;
  const y2 = y1 * cosX - z1 * sinX;
  const z2 = y1 * sinX + z1 * cosX;
  // Rz
  const x3 = x2 * cosZ - y2 * sinZ;
  const y3 = x2 * sinZ + y2 * cosZ;
  const z3 = z2;
  return [x3, y3, z3];
}

interface CubeFaceProps {
  face: FaceSpec;
  rx: SharedValue<number>;
  ry: SharedValue<number>;
  rz: SharedValue<number>;
}

const PERSPECTIVE_INV = -1 / 850;

function CubeFace({
  face,
  rx,
  ry,
  rz,
}: CubeFaceProps): React.JSX.Element {
  const faceStyle = useAnimatedStyle(() => {
    const ax = rx.value * DEG2RAD;
    const ay = ry.value * DEG2RAD;
    const az = rz.value * DEG2RAD;

    const cosX = Math.cos(ax);
    const sinX = Math.sin(ax);
    const cosY = Math.cos(ay);
    const sinY = Math.sin(ay);
    const cosZ = Math.cos(az);
    const sinZ = Math.sin(az);

    const ru = rotateVec(face.u, cosX, sinX, cosY, sinY, cosZ, sinZ);
    const rv = rotateVec(face.v, cosX, sinX, cosY, sinY, cosZ, sinZ);
    const rn = rotateVec(face.n, cosX, sinX, cosY, sinY, cosZ, sinZ);

    const visible = rn[2] > 0.005;
    const tz = rn[2] * HALF;

    // Single-element matrix transform (Fabric requires configurations.size() === 1 with matrix)
    // with perspective (-1 / 850) pre-multiplied cleanly.
    const matrix: number[] = [
      ru[0],
      ru[1],
      ru[2],
      ru[2] * PERSPECTIVE_INV,
      rv[0],
      rv[1],
      rv[2],
      rv[2] * PERSPECTIVE_INV,
      rn[0],
      rn[1],
      rn[2],
      rn[2] * PERSPECTIVE_INV,
      rn[0] * HALF,
      rn[1] * HALF,
      tz,
      1 + tz * PERSPECTIVE_INV,
    ];

    return {
      opacity: visible ? 1 : 0,
      zIndex: Math.round(rn[2] * 100),
      transform: [{ matrix }],
    };
  });

  const shadeStyle = useAnimatedStyle(() => {
    const ax = rx.value * DEG2RAD;
    const ay = ry.value * DEG2RAD;
    const az = rz.value * DEG2RAD;
    const rn = rotateVec(
      face.n,
      Math.cos(ax),
      Math.sin(ax),
      Math.cos(ay),
      Math.sin(ay),
      Math.cos(az),
      Math.sin(az),
    );
    // Top-left-front directional light for crisp 3D depth across faces
    const light = rn[0] * -0.32 + rn[1] * -0.54 + rn[2] * 0.78;
    const clamped = Math.max(0, Math.min(1, (light + 0.35) / 1.15));
    return {
      opacity: (1 - clamped) * 0.36,
    };
  });

  const pips = PIP_LAYOUTS[face.pips] ?? PIP_LAYOUTS[1];

  return (
    <Animated.View style={[styles.face, faceStyle]} pointerEvents="none">
      <View style={styles.faceInner}>
        {pips.map(([px, py], idx) => (
          <View
            key={idx}
            style={[
              styles.pip,
              face.pips === 1 && styles.centerPip,
              {
                transform: [
                  { translateX: px * 48 },
                  { translateY: py * 48 },
                ],
              },
            ]}
          />
        ))}
      </View>
      <Animated.View style={[styles.shadeOverlay, shadeStyle]} />
    </Animated.View>
  );
}

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
  const rx = useSharedValue(REST_RX);
  const ry = useSharedValue(REST_RY);
  const rz = useSharedValue(REST_RZ);

  useEffect(() => {
    if (!isRolling) return;

    rx.value = REST_RX;
    ry.value = REST_RY;
    rz.value = REST_RZ;

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
      withTiming(1.16, { duration: 340, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 240, easing: Easing.in(Easing.quad) }),
      withTiming(0.95, { duration: 60, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 14, stiffness: 200 }),
    );

    rx.value = withSequence(
      withTiming(REST_RX - 26, { duration: 150, easing: Easing.in(Easing.quad) }),
      withTiming(REST_RX + 736, { duration: 580, easing: Easing.out(Easing.cubic) }),
      withSpring(REST_RX + 720, { damping: 14, stiffness: 160 }),
    );

    ry.value = withSequence(
      withTiming(REST_RY + 20, { duration: 150, easing: Easing.in(Easing.quad) }),
      withTiming(REST_RY + 706, { duration: 580, easing: Easing.out(Easing.cubic) }),
      withSpring(REST_RY + 720, { damping: 14, stiffness: 160 }),
    );

    rz.value = withSequence(
      withTiming(-24, { duration: 150, easing: Easing.in(Easing.quad) }),
      withTiming(360, { duration: 990, easing: Easing.out(Easing.cubic) }),
    );
  }, [isRolling, translateY, scale, rx, ry, rz]);

  const cubeStageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const shadowAnimatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(translateY.value);
    const shadowScale = interpolate(
      distance,
      [0, 92, 240],
      [1, 0.58, 0.35],
      'clamp',
    );
    const shadowOpacity = interpolate(
      distance,
      [0, 92, 240],
      [0.24, 0.08, 0.02],
      'clamp',
    );
    return {
      opacity: shadowOpacity,
      transform: [{ scaleX: shadowScale }, { scaleY: shadowScale }],
    };
  });

  return (
    <Pressable onPress={onPress} disabled={isRolling} style={styles.touchArea}>
      <Animated.View style={[styles.cubeOrigin, cubeStageStyle]}>
        {FACES.map((face) => (
          <CubeFace
            key={face.id}
            face={face}
            rx={rx}
            ry={ry}
            rz={rz}
          />
        ))}
      </Animated.View>
      <Animated.View style={[styles.floorShadow, shadowAnimatedStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    overflow: 'visible',
  },
  cubeOrigin: {
    width: CUBE_SIZE,
    height: CUBE_SIZE,
    overflow: 'visible',
  },
  face: {
    position: 'absolute',
    width: CUBE_SIZE,
    height: CUBE_SIZE,
    borderRadius: 10,
    backgroundColor: '#C86141',
    borderWidth: 1.5,
    borderColor: 'rgba(255,244,236,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  faceInner: {
    width: CUBE_SIZE - 22,
    height: CUBE_SIZE - 22,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,244,236,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pip: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF9F5',
  },
  centerPip: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  shadeOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#2E120A',
  },
  floorShadow: {
    width: 156,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2B1812',
    marginTop: 42,
  },
});
