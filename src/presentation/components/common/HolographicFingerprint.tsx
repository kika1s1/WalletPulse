import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

/**
 * A cinematic "holographic scanner" fingerprint. Built from hand-crafted SVG
 * whorl paths layered under:
 *   - a rotating iridescent rim,
 *   - a slow "breathing" aura,
 *   - a vertical scan-line sweep,
 * plus a success ring when `active` is true.
 *
 * All animations run on the UI thread via Reanimated; nothing ticks on the JS
 * thread, so the effect stays smooth even under load.
 */
export type HolographicFingerprintProps = {
  size?: number;
  active: boolean;
  busy?: boolean;
  ridgeColor?: string;
  accentColor?: string;
  glowColor?: string;
  disabled?: boolean;
};

const AnimatedLinearGradient =
  Animated.createAnimatedComponent(LinearGradient);

export function HolographicFingerprint({
  size = 140,
  active,
  busy = false,
  ridgeColor = '#9FD7FF',
  accentColor = '#6C5CE7',
  glowColor = '#6C5CE7',
  disabled = false,
}: HolographicFingerprintProps) {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0);
  const scan = useSharedValue(0);
  const ridgeOpacity = useSharedValue(active ? 1 : 0.55);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {duration: active ? 6000 : 12000, easing: Easing.linear}),
      -1,
      false,
    );
    return () => {
      cancelAnimation(rotation);
    };
  }, [active, rotation]);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, {duration: 1400, easing: Easing.inOut(Easing.sin)}),
          withTiming(0, {duration: 1400, easing: Easing.inOut(Easing.sin)}),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(0, {duration: 300});
    }
    return () => {
      cancelAnimation(pulse);
    };
  }, [active, pulse]);

  useEffect(() => {
    if (active || busy) {
      scan.value = withRepeat(
        withTiming(1, {
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        false,
      );
    } else {
      scan.value = withTiming(0, {duration: 200});
    }
    return () => {
      cancelAnimation(scan);
    };
  }, [active, busy, scan]);

  useEffect(() => {
    ridgeOpacity.value = withTiming(active ? 1 : 0.55, {duration: 350});
  }, [active, ridgeOpacity]);

  const rimStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}],
  }));

  const auraStyle = useAnimatedStyle(() => {
    const base = active ? 0.45 : 0.15;
    const add = active ? 0.35 : 0.05;
    return {
      opacity: base + pulse.value * add,
      transform: [{scale: 1 + pulse.value * 0.06}],
    };
  });

  const scanStyle = useAnimatedStyle(() => {
    const inner = size * 0.64;
    return {
      opacity: active || busy ? 0.9 : 0,
      transform: [
        {translateY: -inner / 2 + scan.value * inner},
      ],
    };
  });

  const ridgeStyle = useAnimatedStyle(() => ({
    opacity: ridgeOpacity.value,
  }));

  const rimSize = size;
  const auraSize = size * 1.25;
  const discSize = size * 0.82;
  const svgSize = size * 0.62;
  const scanWidth = size * 0.62;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          width: auraSize,
          height: auraSize,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <Animated.View
        style={[
          styles.aura,
          auraStyle,
          {
            width: auraSize,
            height: auraSize,
            borderRadius: auraSize / 2,
            backgroundColor: glowColor,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.rimHost,
          rimStyle,
          {
            width: rimSize,
            height: rimSize,
            borderRadius: rimSize / 2,
          },
        ]}>
        <AnimatedLinearGradient
          colors={[
            '#7AF7FF',
            accentColor,
            '#C6A5FF',
            accentColor,
            '#7AF7FF',
          ]}
          end={{x: 1, y: 1}}
          start={{x: 0, y: 0}}
          style={[
            styles.rim,
            {
              width: rimSize,
              height: rimSize,
              borderRadius: rimSize / 2,
            },
          ]}
        />
      </Animated.View>

      <View
        style={[
          styles.disc,
          {
            width: discSize,
            height: discSize,
            borderRadius: discSize / 2,
            backgroundColor: 'rgba(10, 14, 26, 0.65)',
            borderColor: active
              ? accentColor
              : 'rgba(255, 255, 255, 0.15)',
          },
        ]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0.12)',
            'rgba(255,255,255,0.02)',
            'rgba(255,255,255,0.08)',
          ]}
          end={{x: 0.5, y: 1}}
          start={{x: 0.5, y: 0}}
          style={[
            StyleSheet.absoluteFill,
            {borderRadius: discSize / 2},
          ]}
        />

        <Animated.View style={ridgeStyle}>
          <FingerprintSvg
            ridgeColor={ridgeColor}
            accentColor={accentColor}
            size={svgSize}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.scanLineClip,
            {
              width: scanWidth,
              height: 1,
            },
            scanStyle,
          ]}>
          <LinearGradient
            colors={[
              'rgba(122, 247, 255, 0)',
              ridgeColor,
              'rgba(122, 247, 255, 0)',
            ]}
            end={{x: 1, y: 0}}
            start={{x: 0, y: 0}}
            style={styles.scanLine}
          />
        </Animated.View>
      </View>
    </View>
  );
}

function FingerprintSvg({
  ridgeColor,
  accentColor,
  size,
}: {
  ridgeColor: string;
  accentColor: string;
  size: number;
}) {
  // Hand-crafted concentric whorls to evoke a real fingerprint. Viewbox is
  // 100x100 so stroke widths stay visually consistent across sizes.
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgLinearGradient id="ridgeGrad" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={ridgeColor} stopOpacity="1" />
          <Stop offset="1" stopColor={accentColor} stopOpacity="0.9" />
        </SvgLinearGradient>
      </Defs>

      <Path
        d="M50 12 C28 12 14 30 14 52 C14 63 17 73 22 82"
        stroke="url(#ridgeGrad)"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M50 20 C32 20 22 34 22 52 C22 63 24 72 28 80"
        stroke="url(#ridgeGrad)"
        strokeWidth="2.3"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M50 28 C36 28 28 40 28 53 C28 63 30 72 33 79"
        stroke="url(#ridgeGrad)"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M50 36 C40 36 34 46 34 55 C34 64 35 72 38 78"
        stroke="url(#ridgeGrad)"
        strokeWidth="1.9"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M50 44 C44 44 40 50 40 57 C40 64 41 71 43 77"
        stroke="url(#ridgeGrad)"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M50 52 C47 52 46 56 46 60 C46 66 47 71 48 76"
        stroke="url(#ridgeGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      <Path
        d="M50 16 C70 16 84 32 84 52 C84 62 82 72 78 81"
        stroke="url(#ridgeGrad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M50 24 C66 24 76 36 76 52 C76 62 74 72 71 79"
        stroke="url(#ridgeGrad)"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M50 32 C62 32 70 42 70 54 C70 63 69 71 67 78"
        stroke="url(#ridgeGrad)"
        strokeWidth="1.9"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M50 40 C58 40 64 48 64 56 C64 63 63 71 62 77"
        stroke="url(#ridgeGrad)"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M50 48 C54 48 58 52 58 58 C58 64 57 70 56 76"
        stroke="url(#ridgeGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      <Path
        d="M43 62 C47 60 53 60 57 62"
        stroke={accentColor}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M41 70 C46 67 54 67 59 70"
        stroke={accentColor}
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
  },
  rimHost: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rim: {
    position: 'absolute',
  },
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  scanLineClip: {
    position: 'absolute',
    overflow: 'visible',
  },
  scanLine: {
    flex: 1,
    height: 1,
  },
});
