import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Animated, {FadeIn, FadeInDown, FadeInUp} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Input} from '@presentation/components/common';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {AuthRepository} from '@data/repositories/AuthRepository';
import {getSupabaseClient} from '@data/datasources/supabase-client';
import type {AuthStackScreenProps} from '@presentation/navigation/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({navigation}: AuthStackScreenProps<'ForgotPassword'>) {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email is required');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError('Enter a valid email address');
      return;
    }

    setIsLoading(true);
    setEmailError(undefined);
    try {
      const repo = new AuthRepository(getSupabaseClient());
      await repo.requestPasswordReset(trimmed);
    } catch {
      // Silently succeed to prevent email enumeration
    }
    setIsLoading(false);
    setSent(true);
  }, [email]);

  const handleGoToReset = useCallback(() => {
    navigation.navigate('ResetPassword', {email: email.trim()});
  }, [navigation, email]);

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
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <AppIcon name="arrow-left" size={24} color={colors.text} />
          </Pressable>
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(150).duration(400)}
          style={[styles.title, {color: colors.text}]}
        >
          Reset Password
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(250).duration(400)}
          style={[styles.subtitle, {color: colors.textSecondary}]}
        >
          Enter your email address and we will send you instructions to reset your password.
        </Animated.Text>

        {sent ? (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={[styles.successCard, {backgroundColor: colors.successLight, borderRadius: radius.lg}]}
          >
            <View style={[styles.successIcon, {backgroundColor: colors.success + '22'}]}>
              <AppIcon name="check-circle-outline" size={32} color={colors.success} />
            </View>
            <Text style={[styles.successTitle, {color: colors.text}]}>Check your email</Text>
            <Text style={[styles.successBody, {color: colors.textSecondary}]}>
              If an account with that email exists, you will receive a 6-digit reset code shortly.
            </Text>
            <Pressable
              onPress={handleGoToReset}
              style={({pressed}) => [
                styles.backToLoginBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Text style={styles.backToLoginText}>Enter Reset Code</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Login')}
              style={styles.secondaryLink}
            >
              <Text style={[styles.secondaryLinkText, {color: colors.textTertiary}]}>Back to Sign In</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInUp.delay(350).duration(400)} style={styles.form}>
              <Input
                label="Email"
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailError(undefined); }}
                placeholder="you@example.com"
                keyboardType="email-address"
                error={emailError}
                testID="forgot-email"
              />
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(450).duration(400)}>
              <Pressable
                accessibilityRole="button"
                onPress={handleSubmit}
                disabled={isLoading}
                style={({pressed}) => [
                  styles.submitBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                    opacity: isLoading ? 0.7 : pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text style={styles.submitBtnText}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(550).duration(400)} style={styles.footer}>
              <Pressable onPress={() => navigation.goBack()}>
                <Text style={[styles.footerLink, {color: colors.primary}]}>Back to Sign In</Text>
              </Pressable>
            </Animated.View>
          </>
        )}
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
  form: {
    gap: 16,
    marginBottom: 24,
  },
  submitBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
  },
  successCard: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    lineHeight: 26,
  },
  successBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  backToLoginBtn: {
    height: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    alignSelf: 'stretch',
  },
  backToLoginText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  secondaryLink: {
    paddingVertical: 8,
  },
  secondaryLinkText: {
    fontSize: 14,
    fontWeight: fontWeight.medium,
  },
});
