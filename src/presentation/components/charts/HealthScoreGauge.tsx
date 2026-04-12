import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {Circle} from 'react-native-svg';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';

export type HealthScoreGaugeProps = {
  score: number;
  grade: string;
  trend: 'improving' | 'stable' | 'declining';
  size?: number;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function scoreColor(score: number): string {
  if (score >= 70) {
    return '#27AE60';
  }
  if (score >= 40) {
    return '#F39C12';
  }
  return '#E74C3C';
}

function trendArrow(trend: 'improving' | 'stable' | 'declining'): string {
  switch (trend) {
    case 'improving':
      return '↑';
    case 'declining':
      return '↓';
    default:
      return '→';
  }
}

export const HealthScoreGauge = React.memo(function HealthScoreGauge({
  score,
  grade,
  trend,
  size = 120,
}: HealthScoreGaugeProps) {
  const {colors: themeColors} = useTheme();
  const strokeWidth = size * 0.08;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const color = scoreColor(score);

  return (
    <View
      accessible
      accessibilityLabel={`Health score ${score} out of 100, grade ${grade}, trend ${trend}`}
      style={[styles.container, {width: size, height: size}]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={themeColors.border}
          strokeWidth={strokeWidth}
          fill="none"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.grade, {color}]}>{grade}</Text>
        <Text style={[styles.score, {color: themeColors.text}]}>{score}</Text>
        <Text style={[styles.trend, {color}]}>{trendArrow(trend)}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grade: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
  },
  score: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
    marginTop: -2,
  },
  trend: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
});
