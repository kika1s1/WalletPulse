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

export default function ResetPasswordScreen({
  navigation,
  route,
}: AuthStackScreenProps<'ResetPassword'>) {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const {email} = route.params;

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!code.trim()) {
      errors.code = 'Reset code is required';
    } else if (code.trim().length !== 6) {
      errors.code = 'Code must be 6 digits';
    }
    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [code, newPassword, confirmPassword]);

  const handleReset = useCallback(async () => {
    if (!validate()) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const repo = new AuthRepository(getSupabaseClient());
      await repo.resetPassword(email, code.trim(), newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
    setIsLoading(false);
  }, [validate, email, code, newPassword]);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => ({...prev, [field]: undefined}));
    setError(null);
  }, []);

  if (success) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background}]}>
        <View
          style={[
            styles.successContainer,
            {paddingHorizontal: spacing.base, paddingTop: insets.top + spacing['3xl']},
          ]}
        >
          <Animated.View
            entering={FadeIn.duration(400)}
            style={[styles.successCard, {backgroundColor: colors.successLight, borderRadius: radius.lg}]}
          >
            <View style={[styles.successIcon, {backgroundColor: colors.success + '22'}]}>
              <AppIcon name="check-circle-outline" size={40} color={colors.success} />
            </View>
            <Text style={[styles.successTitle, {color: colors.text}]}>Password Reset</Text>
            <Text style={[styles.successBody, {color: colors.textSecondary}]}>
              Your password has been updated successfully. You can now sign in with your new password.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Login')}
              style={({pressed}) => [
                styles.signInBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Text style={styles.signInBtnText}>Sign In</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  }

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
          Enter Reset Code
        </Animated.Text>

        <Animated.Text
          entering={FadeInUp.delay(250).duration(400)}
          style={[styles.subtitle, {color: colors.textSecondary}]}
        >
          We sent a 6-digit code to {email}. Enter it below with your new password.
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
            label="Reset Code"
            value={code}
            onChangeText={(t) => {
              const digits = t.replace(/[^0-9]/g, '').slice(0, 6);
              setCode(digits);
              clearFieldError('code');
            }}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            error={fieldErrors.code}
            testID="reset-code"
          />

          <Input
            label="New Password"
            value={newPassword}
            onChangeText={(t) => { setNewPassword(t); clearFieldError('newPassword'); }}
            placeholder="Minimum 8 characters"
            secureTextEntry={!showPassword}
            error={fieldErrors.newPassword}
            rightIcon={
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <AppIcon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textTertiary}
                />
              </Pressable>
            }
            testID="reset-new-password"
          />

          <Input
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); clearFieldError('confirmPassword'); }}
            placeholder="Re-enter your password"
            secureTextEntry={!showPassword}
            error={fieldErrors.confirmPassword}
            testID="reset-confirm-password"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(450).duration(400)}>
          <Pressable
            accessibilityRole="button"
            onPress={handleReset}
            disabled={isLoading}
            style={({pressed}) => [
              styles.resetBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                opacity: isLoading ? 0.7 : pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={styles.resetBtnText}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Text>
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
  resetBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  successCard: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    lineHeight: 28,
  },
  successBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  signInBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginTop: 8,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
});
