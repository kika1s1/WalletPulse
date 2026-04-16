import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Animated, {FadeInDown, FadeInUp} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Input} from '@presentation/components/common';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {useAuthStore} from '@presentation/stores/useAuthStore';
import type {AuthStackScreenProps} from '@presentation/navigation/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PasswordStrength = 'weak' | 'fair' | 'strong' | 'very_strong';

function getPasswordStrength(password: string): {level: PasswordStrength; score: number} {
  let score = 0;
  if (password.length >= 8) {score += 1;}
  if (password.length >= 12) {score += 1;}
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {score += 1;}
  if (/\d/.test(password)) {score += 1;}
  if (/[^a-zA-Z0-9]/.test(password)) {score += 1;}

  if (score <= 1) {return {level: 'weak', score: 1};}
  if (score <= 2) {return {level: 'fair', score: 2};}
  if (score <= 3) {return {level: 'strong', score: 3};}
  return {level: 'very_strong', score: 4};
}

const STRENGTH_CONFIG: Record<PasswordStrength, {label: string; colorKey: 'danger' | 'warning' | 'success' | 'primary'}> = {
  weak: {label: 'Weak', colorKey: 'danger'},
  fair: {label: 'Fair', colorKey: 'warning'},
  strong: {label: 'Strong', colorKey: 'success'},
  very_strong: {label: 'Very strong', colorKey: 'primary'},
};

export default function SignUpScreen({navigation}: AuthStackScreenProps<'SignUp'>) {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const {signUp, isLoading, error, clearError} = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fullName, email, password, confirmPassword]);

  const handleSignUp = useCallback(async () => {
    if (!validate()) {
      return;
    }
    try {
      await signUp(email.trim(), password, fullName.trim());
    } catch {
      // Error is captured in useAuthStore
    }
  }, [validate, signUp, email, password, fullName]);

  const clearFieldError = useCallback(
    (field: string) => {
      setFieldErrors((prev) => ({...prev, [field]: undefined}));
      if (error) {
        clearError();
      }
    },
    [error, clearError],
  );

  const strengthColor = colors[STRENGTH_CONFIG[strength.level].colorKey];

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {paddingHorizontal: spacing.base, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing['3xl']},
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={40}
      >
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backBtn}>
            <AppIcon name="arrow-left" size={24} color={colors.text} />
          </Pressable>
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(150).duration(400)}
          style={[styles.title, {color: colors.text}]}
        >
          Create Account
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(250).duration(400)}
          style={[styles.subtitle, {color: colors.textSecondary}]}
        >
          Start tracking your finances today
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

        <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.form}>
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={(t) => { setFullName(t); clearFieldError('fullName'); }}
            placeholder="John Doe"
            error={fieldErrors.fullName}
            testID="signup-name"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={(t) => { setEmail(t); clearFieldError('email'); }}
            placeholder="you@example.com"
            keyboardType="email-address"
            error={fieldErrors.email}
            testID="signup-email"
          />

          <View>
            <Input
              label="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); clearFieldError('password'); }}
              placeholder="Minimum 8 characters"
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
              testID="signup-password"
            />
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor: i <= strength.score ? strengthColor : colors.border,
                          borderRadius: 2,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, {color: strengthColor}]}>
                  {STRENGTH_CONFIG[strength.level].label}
                </Text>
              </View>
            )}
          </View>

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); clearFieldError('confirmPassword'); }}
            placeholder="Re-enter your password"
            secureTextEntry={!showPassword}
            error={fieldErrors.confirmPassword}
            testID="signup-confirm"
          />

          <Pressable
            onPress={() => setTermsAccepted(!termsAccepted)}
            style={styles.termsRow}
            accessibilityRole="checkbox"
            accessibilityState={{checked: termsAccepted}}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: termsAccepted ? colors.primary : colors.border,
                  backgroundColor: termsAccepted ? colors.primary : 'transparent',
                  borderRadius: radius.xs,
                },
              ]}
            >
              {termsAccepted && <AppIcon name="check" size={14} color="#FFFFFF" />}
            </View>
            <Text style={[styles.termsText, {color: colors.textSecondary}]}>
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(450).duration(400)}>
          <Pressable
            accessibilityRole="button"
            onPress={handleSignUp}
            disabled={isLoading}
            style={({pressed}) => [
              styles.signUpBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                opacity: isLoading ? 0.7 : pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={styles.signUpBtnText}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(550).duration(400)} style={styles.footer}>
          <Text style={[styles.footerText, {color: colors.textSecondary}]}>
            Already have an account?{' '}
          </Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={[styles.footerLink, {color: colors.primary}]}>Sign In</Text>
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
  header: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 28,
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    minWidth: 80,
    textAlign: 'right',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  signUpBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpBtnText: {
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
