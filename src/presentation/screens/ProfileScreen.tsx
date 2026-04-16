import React, {useCallback, useEffect, useRef, useMemo, useState} from 'react';
import {Alert, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Animated, {FadeIn, FadeInDown, FadeInUp} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import BottomSheet, {BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import {launchImageLibrary} from 'react-native-image-picker';
import ReactNativeHapticFeedback, {
  HapticFeedbackTypes,
} from 'react-native-haptic-feedback';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Button, Input} from '@presentation/components/common';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {Skeleton} from '@presentation/components/feedback/Skeleton';
import {useAuthStore} from '@presentation/stores/useAuthStore';
import {useAccountStats} from '@presentation/hooks/useAccountStats';
import type {SettingsStackScreenProps} from '@presentation/navigation/types';

function triggerLightHaptic() {
  ReactNativeHapticFeedback.trigger(HapticFeedbackTypes.impactLight, {
    enableVibrateFallback: true,
  });
}

function getInitials(name: string, email?: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    return trimmed
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }
  if (email && email.length > 0) {
    return email[0].toUpperCase();
  }
  return '';
}

type SectionRowProps = {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  loading?: boolean;
  isLast?: boolean;
};

function SectionRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  loading,
  isLast,
}: SectionRowProps) {
  const {colors} = useTheme();
  return (
    <View
      style={[
        styles.statRow,
        !isLast && {
          borderBottomColor: colors.borderLight,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}>
      <View style={[styles.statIconWrap, {backgroundColor: iconBg}]}>
        <AppIcon name={icon} size={16} color={iconColor} />
      </View>
      <Text style={[styles.statLabel, {color: colors.textSecondary}]}>{label}</Text>
      {loading ? (
        <Skeleton width={32} height={16} borderRadius={4} />
      ) : (
        <Text style={[styles.statValue, {color: colors.text}]}>{value}</Text>
      )}
    </View>
  );
}

export default function ProfileScreen({
  navigation,
}: SettingsStackScreenProps<'Profile'>) {
  const {colors, spacing, radius, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const {
    user,
    isLoading,
    error,
    updateProfile,
    signOut,
    changePassword,
    deleteAccount,
    clearError,
  } = useAuthStore();
  const {stats, isLoading: statsLoading} = useAccountStats();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const logoutSheetRef = useRef<BottomSheet>(null);
  const deleteSheetRef = useRef<BottomSheet>(null);
  const logoutSnapPoints = useMemo(() => ['32%'], []);
  const deleteSnapPoints = useMemo(() => ['56%'], []);

  useEffect(() => {
    const nameChanged = fullName.trim() !== (user?.fullName ?? '');
    const addressChanged = address.trim() !== (user?.address ?? '');
    setHasChanges(nameChanged || addressChanged);
  }, [fullName, address, user?.fullName, user?.address]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handlePickAvatar = useCallback(async () => {
    triggerLightHaptic();
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 512,
        maxHeight: 512,
        selectionLimit: 1,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      const uri = asset.uri;
      if (!uri) {
        return;
      }
      setUploadingAvatar(true);
      await updateProfile({avatarUrl: uri});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      Alert.alert(
        'Upload failed',
        err instanceof Error ? err.message : 'Could not update photo',
      );
    } finally {
      setUploadingAvatar(false);
    }
  }, [updateProfile]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      return;
    }
    triggerLightHaptic();
    try {
      await updateProfile({
        fullName: fullName.trim(),
        address: address.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch {
      // store captures error
    }
  }, [hasChanges, fullName, address, updateProfile]);

  const handleChangePassword = useCallback(async () => {
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    triggerLightHaptic();
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordForm(false);
      }, 2500);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Failed to change password',
      );
    } finally {
      setPasswordLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, changePassword]);

  const handleLogoutPress = useCallback(() => {
    triggerLightHaptic();
    logoutSheetRef.current?.expand();
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    logoutSheetRef.current?.close();
    await signOut();
  }, [signOut]);

  const handleLogoutCancel = useCallback(() => {
    logoutSheetRef.current?.close();
  }, []);

  const handleDeletePress = useCallback(() => {
    triggerLightHaptic();
    setDeleteConfirmText('');
    deleteSheetRef.current?.expand();
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    deleteSheetRef.current?.close();
    try {
      await deleteAccount();
    } catch {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    }
  }, [deleteAccount]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmText('');
    deleteSheetRef.current?.close();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  if (!user) {
    return (
      <View
        style={[
          styles.root,
          styles.centered,
          {backgroundColor: colors.background},
        ]}>
        <AppIcon name="account-outline" size={48} color={colors.textTertiary} />
        <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
          Profile unavailable
        </Text>
      </View>
    );
  }

  const initials = getInitials(user.fullName, user.email);
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  const deleteConfirmValid =
    deleteConfirmText.trim().toLowerCase() === 'delete';

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.borderLight,
          },
        ]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={16}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <AppIcon name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, {color: colors.text}]}>Profile</Text>
        <View style={{width: 44}} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: spacing.base,
            paddingTop: spacing.lg,
            paddingBottom: insets.bottom + spacing['3xl'],
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={40}>
        <Animated.View
          entering={FadeIn.delay(100).duration(400)}
          style={styles.avatarSection}>
          <Pressable
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={styles.avatarPressable}>
            <View
              style={[
                styles.avatarOuter,
                {
                  backgroundColor: colors.primaryLight + '33',
                  borderRadius: radius.full,
                },
              ]}>
              {user.avatarUrl ? (
                <Image
                  source={{uri: user.avatarUrl}}
                  style={[styles.avatarImage, {borderRadius: radius.full}]}
                />
              ) : (
                <Text style={[styles.avatarText, {color: colors.primary}]}>
                  {initials || (
                    <AppIcon
                      name="account"
                      size={36}
                      color={colors.primary}
                    />
                  )}
                </Text>
              )}
            </View>
            <View
              style={[
                styles.cameraBadge,
                shadows.sm,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.background,
                },
              ]}>
              <AppIcon
                name={uploadingAvatar ? 'loading' : 'camera-outline'}
                size={14}
                color="#FFFFFF"
              />
            </View>
          </Pressable>
          <Text style={[styles.userName, {color: colors.text}]}>
            {user.fullName || 'Unnamed'}
          </Text>
          <Text style={[styles.userEmail, {color: colors.textSecondary}]}>
            {user.email}
          </Text>
          {memberSince ? (
            <View
              style={[
                styles.memberBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.full,
                },
              ]}>
              <AppIcon
                name="calendar-outline"
                size={13}
                color={colors.textTertiary}
              />
              <Text
                style={[
                  styles.memberBadgeText,
                  {color: colors.textTertiary},
                ]}>
                Member since {memberSince}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {saveSuccess && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.banner,
              {
                backgroundColor: colors.successLight,
                borderRadius: radius.md,
              },
            ]}>
            <AppIcon
              name="check-circle-outline"
              size={18}
              color={colors.success}
            />
            <Text style={[styles.bannerText, {color: colors.success}]}>
              Profile updated
            </Text>
          </Animated.View>
        )}

        {error && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.banner,
              {
                backgroundColor: colors.dangerLight,
                borderRadius: radius.md,
              },
            ]}>
            <AppIcon
              name="alert-circle-outline"
              size={18}
              color={colors.danger}
            />
            <Text style={[styles.bannerText, {color: colors.danger}]}>
              {error}
            </Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInUp.delay(200).duration(400)}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>
            Personal Info
          </Text>
          <View
            style={[
              styles.card,
              shadows.sm,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
              },
            ]}>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              leftIcon={
                <AppIcon
                  name="account-outline"
                  size={18}
                  color={colors.textTertiary}
                />
              }
              testID="profile-name"
            />
            <View style={styles.disabledInputWrap}>
              <Input
                label="Email"
                value={user.email}
                onChangeText={() => {}}
                editable={false}
                leftIcon={
                  <AppIcon
                    name="email-outline"
                    size={18}
                    color={colors.textTertiary}
                  />
                }
                rightIcon={
                  <AppIcon
                    name="lock-outline"
                    size={16}
                    color={colors.textTertiary}
                  />
                }
                testID="profile-email"
                helperText="Email cannot be changed"
              />
            </View>
            <Input
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Street, City, Country"
              multiline
              numberOfLines={3}
              testID="profile-address"
              helperText="Used on account statements"
            />
            <Button
              title={isLoading ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={!hasChanges || isLoading}
              loading={isLoading && hasChanges}
              fullWidth
              size="lg"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>
            Security
          </Text>
          <View
            style={[
              styles.card,
              shadows.sm,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                triggerLightHaptic();
                setShowPasswordForm(!showPasswordForm);
              }}
              style={styles.expandRow}>
              <View style={styles.expandRowLeft}>
                <View
                  style={[
                    styles.statIconWrap,
                    {backgroundColor: colors.warningLight},
                  ]}>
                  <AppIcon
                    name="lock-outline"
                    size={16}
                    color={colors.warning}
                  />
                </View>
                <Text
                  style={[styles.expandRowLabel, {color: colors.text}]}>
                  Change Password
                </Text>
              </View>
              <AppIcon
                name={showPasswordForm ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            {showPasswordForm && (
              <Animated.View
                entering={FadeInDown.duration(250)}
                style={styles.passwordForm}>
                {passwordSuccess && (
                  <View
                    style={[
                      styles.banner,
                      {
                        backgroundColor: colors.successLight,
                        borderRadius: radius.md,
                      },
                    ]}>
                    <AppIcon
                      name="check-circle-outline"
                      size={16}
                      color={colors.success}
                    />
                    <Text
                      style={[styles.bannerText, {color: colors.success}]}>
                      Password changed successfully
                    </Text>
                  </View>
                )}
                {passwordError ? (
                  <View
                    style={[
                      styles.banner,
                      {
                        backgroundColor: colors.dangerLight,
                        borderRadius: radius.md,
                      },
                    ]}>
                    <AppIcon
                      name="alert-circle-outline"
                      size={16}
                      color={colors.danger}
                    />
                    <Text
                      style={[styles.bannerText, {color: colors.danger}]}>
                      {passwordError}
                    </Text>
                  </View>
                ) : null}
                <Input
                  label="Current Password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  secureTextEntry={!showCurrentPwd}
                  leftIcon={
                    <AppIcon
                      name="lock-outline"
                      size={18}
                      color={colors.textTertiary}
                    />
                  }
                  rightIcon={
                    <Pressable
                      onPress={() => setShowCurrentPwd(!showCurrentPwd)}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showCurrentPwd ? 'Hide password' : 'Show password'
                      }>
                      <AppIcon
                        name={showCurrentPwd ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  }
                  testID="current-password"
                />
                <Input
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  secureTextEntry={!showNewPwd}
                  leftIcon={
                    <AppIcon
                      name="lock-outline"
                      size={18}
                      color={colors.textTertiary}
                    />
                  }
                  rightIcon={
                    <Pressable
                      onPress={() => setShowNewPwd(!showNewPwd)}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showNewPwd ? 'Hide password' : 'Show password'
                      }>
                      <AppIcon
                        name={showNewPwd ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  }
                  helperText="Minimum 8 characters"
                  testID="new-password"
                />
                <Input
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat new password"
                  secureTextEntry={!showConfirmPwd}
                  leftIcon={
                    <AppIcon
                      name="lock-outline"
                      size={18}
                      color={colors.textTertiary}
                    />
                  }
                  rightIcon={
                    <Pressable
                      onPress={() => setShowConfirmPwd(!showConfirmPwd)}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showConfirmPwd ? 'Hide password' : 'Show password'
                      }>
                      <AppIcon
                        name={
                          showConfirmPwd ? 'eye-off-outline' : 'eye-outline'
                        }
                        size={18}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  }
                  testID="confirm-password"
                />
                <Button
                  title={passwordLoading ? 'Updating...' : 'Update Password'}
                  onPress={handleChangePassword}
                  disabled={
                    passwordLoading ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  loading={passwordLoading}
                  fullWidth
                  size="lg"
                />
              </Animated.View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>
            Account Overview
          </Text>
          <View
            style={[
              styles.card,
              shadows.sm,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                paddingHorizontal: 0,
                paddingVertical: 0,
              },
            ]}>
            <SectionRow
              icon="swap-vertical"
              iconColor={colors.primary}
              iconBg={colors.primaryLight + '33'}
              label="Transactions"
              value={String(stats.totalTransactions)}
              loading={statsLoading}
            />
            <SectionRow
              icon="wallet-outline"
              iconColor={colors.success}
              iconBg={colors.successLight}
              label="Wallets"
              value={String(stats.totalWallets)}
              loading={statsLoading}
            />
            <SectionRow
              icon="tag-outline"
              iconColor={colors.warning}
              iconBg={colors.warningLight}
              label="Categories"
              value={String(stats.totalCategories)}
              loading={statsLoading}
            />
            <SectionRow
              icon="target"
              iconColor="#E040FB"
              iconBg="rgba(224,64,251,0.12)"
              label="Goals"
              value={String(stats.totalGoals)}
              loading={statsLoading}
            />
            <SectionRow
              icon="calculator-variant-outline"
              iconColor={colors.danger}
              iconBg={colors.dangerLight}
              label="Budgets"
              value={String(stats.totalBudgets)}
              loading={statsLoading}
              isLast
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>
            Session
          </Text>
          <View
            style={[
              styles.card,
              shadows.sm,
              {
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
              },
            ]}>
            <Button
              title="Log Out"
              onPress={handleLogoutPress}
              variant="outline"
              fullWidth
              size="lg"
              icon={
                <AppIcon name="logout" size={18} color={colors.primary} />
              }
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(600).duration(400)}>
          <Text style={[styles.sectionTitle, {color: colors.danger}]}>
            Danger Zone
          </Text>
          <View
            style={[
              styles.dangerCard,
              shadows.sm,
              {
                backgroundColor: colors.dangerLight,
                borderColor: colors.danger + '40',
                borderRadius: radius.lg,
              },
            ]}>
            <View style={styles.dangerContent}>
              <AppIcon
                name="alert-outline"
                size={20}
                color={colors.danger}
              />
              <View style={styles.dangerTextWrap}>
                <Text
                  style={[styles.dangerTitle, {color: colors.danger}]}>
                  Delete Account
                </Text>
                <Text
                  style={[
                    styles.dangerDesc,
                    {color: colors.textSecondary},
                  ]}>
                  Permanently remove your account and all associated data.
                  This action cannot be undone.
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete my account"
              onPress={handleDeletePress}
              style={({pressed}) => [
                styles.dangerBtn,
                {
                  backgroundColor: colors.danger,
                  borderRadius: radius.md,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{scale: pressed ? 0.98 : 1}],
                },
              ]}>
              <AppIcon name="delete-outline" size={18} color="#FFFFFF" />
              <Text style={styles.dangerBtnText}>Delete My Account</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>

      <BottomSheet
        ref={logoutSheetRef}
        index={-1}
        snapPoints={logoutSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{backgroundColor: colors.surface}}
        handleIndicatorStyle={{backgroundColor: colors.border}}>
        <BottomSheetView
          style={[
            styles.sheetContent,
            {paddingHorizontal: spacing.base, gap: spacing.md},
          ]}>
          <View
            style={[
              styles.sheetIconWrap,
              {backgroundColor: colors.primaryLight + '33'},
            ]}>
            <AppIcon name="logout" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.sheetTitle, {color: colors.text}]}>
            Log out?
          </Text>
          <Text style={[styles.sheetBody, {color: colors.textSecondary}]}>
            You will need to sign in again to access your account.
          </Text>
          <View style={styles.sheetActions}>
            <Button
              title="Cancel"
              onPress={handleLogoutCancel}
              variant="secondary"
              size="lg"
              fullWidth
              style={styles.sheetBtnFlex}
            />
            <Button
              title="Log Out"
              onPress={handleLogoutConfirm}
              variant="primary"
              size="lg"
              fullWidth
              style={styles.sheetBtnFlex}
            />
          </View>
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet
        ref={deleteSheetRef}
        index={-1}
        snapPoints={deleteSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{backgroundColor: colors.surface}}
        handleIndicatorStyle={{backgroundColor: colors.border}}>
        <BottomSheetView
          style={[
            styles.sheetContent,
            {paddingHorizontal: spacing.base, gap: spacing.md},
          ]}>
          <View
            style={[
              styles.sheetIconWrap,
              {backgroundColor: colors.dangerLight},
            ]}>
            <AppIcon
              name="alert-circle-outline"
              size={28}
              color={colors.danger}
            />
          </View>
          <Text style={[styles.sheetTitle, {color: colors.danger}]}>
            Delete Account?
          </Text>
          <Text style={[styles.sheetBody, {color: colors.textSecondary}]}>
            All your data — transactions, wallets, budgets, and goals — will
            be permanently deleted. This cannot be undone.
          </Text>
          <View style={{width: '100%'}}>
            <Input
              label='Type "DELETE" to confirm'
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              testID="delete-confirm-input"
            />
          </View>
          <View style={styles.sheetActions}>
            <Button
              title="Cancel"
              onPress={handleDeleteCancel}
              variant="secondary"
              size="lg"
              fullWidth
              style={styles.sheetBtnFlex}
            />
            <Pressable
              onPress={deleteConfirmValid ? handleDeleteConfirm : undefined}
              disabled={!deleteConfirmValid}
              accessibilityRole="button"
              accessibilityLabel="Delete Forever"
              style={({pressed}) => [
                styles.sheetDangerBtn,
                {
                  backgroundColor: deleteConfirmValid
                    ? colors.danger
                    : colors.border,
                  borderRadius: radius.md,
                  opacity: deleteConfirmValid ? (pressed ? 0.88 : 1) : 0.6,
                },
              ]}>
              <Text
                style={[
                  styles.sheetDangerBtnText,
                  {
                    color: deleteConfirmValid
                      ? '#FFFFFF'
                      : colors.textTertiary,
                  },
                ]}>
                Delete Forever
              </Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
  scrollContent: {
    flexGrow: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  avatarPressable: {
    width: 96,
    height: 96,
    marginBottom: 12,
    position: 'relative',
  },
  avatarOuter: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 96,
    height: 96,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    lineHeight: 28,
  },
  userEmail: {
    fontSize: 15,
    lineHeight: 20,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
    borderWidth: 1,
  },
  memberBadgeText: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    marginBottom: 10,
    marginTop: 20,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  card: {
    padding: 16,
    gap: 14,
    marginBottom: 4,
  },
  disabledInputWrap: {
    opacity: 0.65,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  expandRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandRowLabel: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
  },
  passwordForm: {
    gap: 12,
    paddingTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: fontWeight.medium,
  },
  statValue: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
  },
  dangerCard: {
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  dangerContent: {
    flexDirection: 'row',
    gap: 12,
  },
  dangerTextWrap: {
    flex: 1,
    gap: 4,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  dangerDesc: {
    fontSize: 15,
    lineHeight: 21,
  },
  dangerBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  sheetContent: {
    paddingBottom: 32,
    alignItems: 'center',
  },
  sheetIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  sheetBody: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  sheetBtnFlex: {
    flex: 1,
  },
  sheetDangerBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDangerBtnText: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
});
