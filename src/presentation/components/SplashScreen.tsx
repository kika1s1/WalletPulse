import React, {useEffect} from 'react';
import {StyleSheet, View, Text, StatusBar} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import {WalletPulseLogoMark} from './WalletPulseLogo';

type SplashScreenProps = {
  onFinish: () => void;
};

export function SplashScreen({onFinish}: SplashScreenProps) {
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {duration: 400, easing: Easing.out(Easing.cubic)});
    logoScale.value = withSpring(1, {damping: 12, stiffness: 100});

    textOpacity.value = withDelay(300, withTiming(1, {duration: 400}));
    textTranslateY.value = withDelay(300, withSpring(0, {damping: 14}));

    containerOpacity.value = withDelay(
      1600,
      withTiming(0, {duration: 400}, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      }),
    );
  }, [logoScale, logoOpacity, textOpacity, textTranslateY, containerOpacity, onFinish]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{scale: logoScale.value}],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{translateY: textTranslateY.value}],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <StatusBar backgroundColor="#6C5CE7" barStyle="light-content" />
      <Animated.View style={[styles.logoWrap, logoAnimStyle]}>
        <WalletPulseLogoMark size={100} />
      </Animated.View>
      <Animated.View style={[styles.textWrap, textAnimStyle]}>
        <Text style={styles.brandText}>
          <Text style={styles.brandWallet}>Wallet</Text>
          <Text style={styles.brandPulse}>Pulse</Text>
        </Text>
        <Text style={styles.tagline}>Smart expense tracking</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoWrap: {
    marginBottom: 20,
  },
  textWrap: {
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  brandWallet: {
    color: '#FFFFFF',
  },
  brandPulse: {
    color: '#A29BFE',
  },
  tagline: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
