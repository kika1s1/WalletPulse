import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
  G,
} from 'react-native-svg';
import {useTheme} from '@shared/theme';

type LogoVariant = 'icon' | 'full' | 'text';

type WalletPulseLogoProps = {
  size?: number;
  variant?: LogoVariant;
  showText?: boolean;
  color?: string;
};

function LogoIcon({size, color}: {size: number; color?: string}) {
  const primaryColor = color ?? '#6C5CE7';
  const accentColor = '#A29BFE';

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={primaryColor} stopOpacity="1" />
          <Stop offset="1" stopColor="#4132AA" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="shineGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.15" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="120" height="120" rx="26" ry="26" fill="url(#bgGrad)" />
      <Rect x="0" y="0" width="120" height="120" rx="26" ry="26" fill="url(#shineGrad)" />

      {/* Bold W letter */}
      <Path
        d="M30 38 L42 82 L60 52 L78 82 L90 38"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Pulse/heartbeat line */}
      <Path
        d="M22 72 L40 72 L46 80 L52 58 L58 78 L62 65 L66 72 L98 72"
        fill="none"
        stroke={accentColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Subtle glow dot at pulse peak */}
      <Circle cx="52" cy="58" r="3" fill={accentColor} opacity="0.6" />
    </Svg>
  );
}

export function WalletPulseLogo({
  size = 48,
  variant = 'full',
  showText = true,
  color,
}: WalletPulseLogoProps) {
  const {colors} = useTheme();

  if (variant === 'icon') {
    return <LogoIcon size={size} color={color} />;
  }

  if (variant === 'text') {
    return (
      <View style={styles.textContainer}>
        <Text style={[styles.brandName, {color: colors.text, fontSize: size * 0.5}]}>
          Wallet
        </Text>
        <Text
          style={[
            styles.brandName,
            styles.brandAccent,
            {color: color ?? colors.primary, fontSize: size * 0.5},
          ]}>
          Pulse
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LogoIcon size={size} color={color} />
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.brandName, {color: colors.text}]}>Wallet</Text>
          <Text
            style={[
              styles.brandName,
              styles.brandAccent,
              {color: color ?? colors.primary},
            ]}>
            Pulse
          </Text>
        </View>
      )}
    </View>
  );
}

export function WalletPulseLogoMark({
  size = 80,
  color,
}: {
  size?: number;
  color?: string;
}) {
  return <LogoIcon size={size} color={color} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandAccent: {
    fontWeight: '800',
  },
});
