import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Input} from '@presentation/components/common';
import {WalletPulseLogoMark} from '@presentation/components/WalletPulseLogo';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {useAuthStore} from '@presentation/stores/useAuthStore';
import type {AuthStackScreenProps} from '@presentation/navigation/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({navigation}: AuthStackScreenProps<'Login'>) {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const {signIn, isLoading, error, clearError} = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{email?: string; password?: string}>({});

  const validate = useCallback((): boolean => {
    const errors: {email?: string; password?: string} = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleSignIn = useCallback(async () => {
    if (!validate()) {
      return;
    }
    try {
      await signIn(email.trim(), password);
    } catch {
      // Error is captured in useAuthStore
    }
  }, [validate, signIn, email, password]);

  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (fieldErrors.email) {
        setFieldErrors((prev) => ({...prev, email: undefined}));
      }
      if (error) {
        clearError();
      }
    },
    [fieldErrors.email, error, clearError],
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (fieldErrors.password) {
        setFieldErrors((prev) => ({...prev, password: undefined}));
      }
      if (error) {
        clearError();
      }
    },
    [fieldErrors.password, error, clearError],
  );

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {paddingHorizontal: spacing.base, paddingTop: insets.top + spacing['2xl'], paddingBottom: insets.bottom + spacing['3xl']},
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={40}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.logoContainer}>
          <WalletPulseLogoMark size={72} />
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(200).duration(400)}
          style={[styles.title, {color: colors.text}]}
        >
          Welcome back
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(300).duration(400)}
          style={[styles.subtitle, {color: colors.textSecondary}]}
        >
          Sign in to continue tracking your finances
        </Animated.Text>

        {error && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[styles.errorBanner, {backgroundColor: colors.dangerLight, borderRadius: radius.md}]}
          >
            <AppIcon name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={[styles.errorBannerText, {color: colors.danger}]}>{error}</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={handleEmailChange}
            placeholder="you@example.com"
            keyboardType="email-address"
            error={fieldErrors.email}
            testID="login-email"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={handlePasswordChange}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            error={fieldErrors.password}
            rightIcon={
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <AppIcon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            }
            testID="login-password"
          />

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotLink}
          >
            <Text style={[styles.forgotText, {color: colors.primary}]}>Forgot password?</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(400)}>
          <Pressable
            accessibilityRole="button"
            onPress={handleSignIn}
            disabled={isLoading}
            style={({pressed}) => [
              styles.signInBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                opacity: isLoading ? 0.7 : pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={styles.signInBtnText}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(600).duration(400)} style={styles.footer}>
          <Text style={[styles.footerText, {color: colors.textSecondary}]}>
            {"Don't have an account? "}
          </Text>
          <Pressable onPress={() => navigation.navigate('SignUp')}>
            <Text style={[styles.footerLink, {color: colors.primary}]}>Create Account</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    lineHeight: 34,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: fontWeight.medium,
    lineHeight: 18,
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  forgotLink: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  signInBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
  },
});
