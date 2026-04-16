import React, {useCallback, useEffect, useRef, useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Animated, {FadeIn, FadeInDown, FadeInUp} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import BottomSheet, {BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {Input} from '@presentation/components/common';
import {AppIcon} from '@presentation/components/common/AppIcon';
import {useAuthStore} from '@presentation/stores/useAuthStore';
import {useAccountStats} from '@presentation/hooks/useAccountStats';
import type {SettingsStackScreenProps} from '@presentation/navigation/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

type SectionRowProps = {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  borderColor: string;
  textColor: string;
  valueColor: string;
  isLast?: boolean;
};

function SectionRow({icon, iconColor, iconBg, label, value, borderColor, textColor, valueColor, isLast}: SectionRowProps) {
  return (
    <View style={[styles.statRow, !isLast && {borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth}]}>
      <View style={[styles.statIconWrap, {backgroundColor: iconBg}]}>
        <AppIcon name={icon} size={16} color={iconColor} />
      </View>
      <Text style={[styles.statLabel, {color: textColor}]}>{label}</Text>
      <Text style={[styles.statValue, {color: valueColor}]}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen({navigation}: SettingsStackScreenProps<'Profile'>) {
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const {user, isLoading, error, updateProfile, signOut, changePassword, deleteAccount, clearError} = useAuthStore();
  const {stats} = useAccountStats();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const logoutSheetRef = useRef<BottomSheet>(null);
  const deleteSheetRef = useRef<BottomSheet>(null);
  const logoutSnapPoints = useMemo(() => ['28%'], []);
  const deleteSnapPoints = useMemo(() => ['36%'], []);

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

  const handleSave = useCallback(async () => {
    if (!hasChanges) { return; }
    try {
      await updateProfile({fullName: fullName.trim(), address: address.trim()});
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
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, changePassword]);

  const handleLogoutPress = useCallback(() => {
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
    deleteSheetRef.current?.close();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  const initials = getInitials(user?.fullName ?? '');
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})
    : '';

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {paddingHorizontal: spacing.base, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing['3xl']},
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={40}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <AppIcon name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, {color: colors.text}]}>Profile</Text>
          <View style={{width: 32}} />
        </Animated.View>

        {/* Avatar */}
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.avatarSection}>
          <View style={[styles.avatarOuter, {backgroundColor: colors.primaryLight + '33'}]}>
            <Text style={[styles.avatarText, {color: colors.primary}]}>
              {initials || '?'}
            </Text>
          </View>
          <Text style={[styles.userName, {color: colors.text}]}>{user?.fullName}</Text>
          <Text style={[styles.userEmail, {color: colors.textSecondary}]}>{user?.email}</Text>
          {memberSince ? (
            <View style={[styles.memberBadge, {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full}]}>
              <AppIcon name="calendar-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.memberBadgeText, {color: colors.textTertiary}]}>
                Member since {memberSince}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {/* Success / Error banners */}
        {saveSuccess && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[styles.banner, {backgroundColor: colors.successLight, borderRadius: radius.md}]}
          >
            <AppIcon name="check-circle-outline" size={18} color={colors.success} />
            <Text style={[styles.bannerText, {color: colors.success}]}>Profile updated</Text>
          </Animated.View>
        )}

        {error && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[styles.banner, {backgroundColor: colors.dangerLight, borderRadius: radius.md}]}
          >
            <AppIcon name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={[styles.bannerText, {color: colors.danger}]}>{error}</Text>
          </Animated.View>
        )}

        {/* Edit Profile Section */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Edit Profile</Text>
          <View style={[styles.card, {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg}]}>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              testID="profile-name"
            />
            <Input
              label="Email"
              value={user?.email ?? ''}
              onChangeText={() => {}}
              editable={false}
              testID="profile-email"
              helperText="Email cannot be changed"
            />
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
            <Pressable
              accessibilityRole="button"
              onPress={handleSave}
              disabled={!hasChanges || isLoading}
              style={({pressed}) => [
                styles.primaryBtn,
                {
                  backgroundColor: hasChanges ? colors.primary : colors.border,
                  borderRadius: radius.md,
                  opacity: isLoading ? 0.7 : pressed ? 0.88 : 1,
                },
              ]}
            >
              <Text style={[styles.primaryBtnText, {color: hasChanges ? '#FFFFFF' : colors.textMuted}]}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Change Password Section */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Security</Text>
          <View style={[styles.card, {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg}]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowPasswordForm(!showPasswordForm)}
              style={styles.expandRow}
            >
              <View style={styles.expandRowLeft}>
                <View style={[styles.statIconWrap, {backgroundColor: colors.warningLight}]}>
                  <AppIcon name="lock-outline" size={16} color={colors.warning} />
                </View>
                <Text style={[styles.expandRowLabel, {color: colors.text}]}>Change Password</Text>
              </View>
              <AppIcon
                name={showPasswordForm ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textTertiary}
              />
            </Pressable>

            {showPasswordForm && (
              <Animated.View entering={FadeInDown.duration(250)} style={styles.passwordForm}>
                {passwordSuccess && (
                  <View style={[styles.banner, {backgroundColor: colors.successLight, borderRadius: radius.md}]}>
                    <AppIcon name="check-circle-outline" size={16} color={colors.success} />
                    <Text style={[styles.bannerText, {color: colors.success}]}>Password changed successfully</Text>
                  </View>
                )}
                {passwordError ? (
                  <View style={[styles.banner, {backgroundColor: colors.dangerLight, borderRadius: radius.md}]}>
                    <AppIcon name="alert-circle-outline" size={16} color={colors.danger} />
                    <Text style={[styles.bannerText, {color: colors.danger}]}>{passwordError}</Text>
                  </View>
                ) : null}
                <Input
                  label="Current Password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  secureTextEntry
                  testID="current-password"
                />
                <Input
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  secureTextEntry
                  helperText="Minimum 8 characters"
                  testID="new-password"
                />
                <Input
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat new password"
                  secureTextEntry
                  testID="confirm-password"
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={handleChangePassword}
                  disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                  style={({pressed}) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: (currentPassword && newPassword && confirmPassword) ? colors.primary : colors.border,
                      borderRadius: radius.md,
                      opacity: passwordLoading ? 0.7 : pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.primaryBtnText, {color: (currentPassword && newPassword && confirmPassword) ? '#FFFFFF' : colors.textMuted}]}>
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* Account Stats Section */}
        <Animated.View entering={FadeInUp.delay(500).duration(400)}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Account Overview</Text>
          <View style={[styles.card, {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 0}]}>
            <SectionRow
              icon="swap-vertical"
              iconColor={colors.primary}
              iconBg={colors.primaryLight + '33'}
              label="Transactions"
              value={String(stats.totalTransactions)}
              borderColor={colors.border}
              textColor={colors.textSecondary}
              valueColor={colors.text}
            />
            <SectionRow
              icon="wallet-outline"
              iconColor={colors.success}
              iconBg={colors.successLight}
              label="Wallets"
              value={String(stats.totalWallets)}
              borderColor={colors.border}
              textColor={colors.textSecondary}
              valueColor={colors.text}
            />
            <SectionRow
              icon="tag-outline"
              iconColor={colors.warning}
              iconBg={colors.warningLight}
              label="Categories"
              value={String(stats.totalCategories)}
              borderColor={colors.border}
              textColor={colors.textSecondary}
              valueColor={colors.text}
            />
            <SectionRow
              icon="target"
              iconColor="#E040FB"
              iconBg="rgba(224,64,251,0.12)"
              label="Goals"
              value={String(stats.totalGoals)}
              borderColor={colors.border}
              textColor={colors.textSecondary}
              valueColor={colors.text}
            />
            <SectionRow
              icon="calculator-variant-outline"
              iconColor={colors.danger}
              iconBg={colors.dangerLight}
              label="Budgets"
              value={String(stats.totalBudgets)}
              borderColor={colors.border}
              textColor={colors.textSecondary}
              valueColor={colors.text}
              isLast
            />
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInUp.delay(600).duration(400)} style={styles.actionsSection}>
          <Pressable
            accessibilityRole="button"
            onPress={handleLogoutPress}
            style={({pressed}) => [
              styles.outlineBtn,
              {
                borderColor: colors.danger,
                borderRadius: radius.md,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <AppIcon name="logout" size={20} color={colors.danger} />
            <Text style={[styles.outlineBtnText, {color: colors.danger}]}>Log Out</Text>
          </Pressable>
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeIn.delay(700).duration(400)}>
          <Text style={[styles.sectionTitle, {color: colors.danger}]}>Danger Zone</Text>
          <View style={[styles.dangerCard, {backgroundColor: colors.dangerLight, borderColor: colors.danger + '40', borderRadius: radius.lg}]}>
            <View style={styles.dangerContent}>
              <AppIcon name="alert-outline" size={20} color={colors.danger} />
              <View style={styles.dangerTextWrap}>
                <Text style={[styles.dangerTitle, {color: colors.danger}]}>Delete Account</Text>
                <Text style={[styles.dangerDesc, {color: colors.textSecondary}]}>
                  Permanently remove your account and all associated data. This action cannot be undone.
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handleDeletePress}
              style={({pressed}) => [
                styles.dangerBtn,
                {
                  backgroundColor: colors.danger,
                  borderRadius: radius.md,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <AppIcon name="delete-outline" size={18} color="#FFFFFF" />
              <Text style={styles.dangerBtnText}>Delete My Account</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>

      {/* Logout Sheet */}
      <BottomSheet
        ref={logoutSheetRef}
        index={-1}
        snapPoints={logoutSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{backgroundColor: colors.surface}}
        handleIndicatorStyle={{backgroundColor: colors.border}}
      >
        <BottomSheetView style={[styles.sheetContent, {paddingHorizontal: spacing.base}]}>
          <Text style={[styles.sheetTitle, {color: colors.text}]}>Log out?</Text>
          <Text style={[styles.sheetBody, {color: colors.textSecondary}]}>
            You will need to sign in again to access your account.
          </Text>
          <View style={styles.sheetActions}>
            <Pressable
              onPress={handleLogoutCancel}
              style={({pressed}) => [
                styles.sheetBtn,
                {backgroundColor: colors.surfaceElevated, borderRadius: radius.md, opacity: pressed ? 0.88 : 1},
              ]}
            >
              <Text style={[styles.sheetBtnText, {color: colors.text}]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleLogoutConfirm}
              style={({pressed}) => [
                styles.sheetBtn,
                {backgroundColor: colors.danger, borderRadius: radius.md, opacity: pressed ? 0.88 : 1},
              ]}
            >
              <Text style={[styles.sheetBtnText, {color: '#FFFFFF'}]}>Log Out</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>

      {/* Delete Account Sheet */}
      <BottomSheet
        ref={deleteSheetRef}
        index={-1}
        snapPoints={deleteSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{backgroundColor: colors.surface}}
        handleIndicatorStyle={{backgroundColor: colors.border}}
      >
        <BottomSheetView style={[styles.sheetContent, {paddingHorizontal: spacing.base}]}>
          <AppIcon name="alert-circle-outline" size={36} color={colors.danger} />
          <Text style={[styles.sheetTitle, {color: colors.danger}]}>Delete Account?</Text>
          <Text style={[styles.sheetBody, {color: colors.textSecondary}]}>
            All your data, including transactions, wallets, budgets, and goals will be permanently deleted. This cannot be undone.
          </Text>
          <View style={styles.sheetActions}>
            <Pressable
              onPress={handleDeleteCancel}
              style={({pressed}) => [
                styles.sheetBtn,
                {backgroundColor: colors.surfaceElevated, borderRadius: radius.md, opacity: pressed ? 0.88 : 1},
              ]}
            >
              <Text style={[styles.sheetBtnText, {color: colors.text}]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleDeleteConfirm}
              style={({pressed}) => [
                styles.sheetBtn,
                {backgroundColor: colors.danger, borderRadius: radius.md, opacity: pressed ? 0.88 : 1},
              ]}
            >
              <Text style={[styles.sheetBtnText, {color: '#FFFFFF'}]}>Delete Forever</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: fontWeight.semibold,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 4,
  },
  avatarOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: fontWeight.bold,
  },
  userName: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    lineHeight: 28,
  },
  userEmail: {
    fontSize: 14,
    lineHeight: 20,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
    borderWidth: 1,
  },
  memberBadgeText: {
    fontSize: 11,
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
    fontSize: 13,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 12,
  },
  primaryBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
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
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: fontWeight.medium,
  },
  statValue: {
    fontSize: 15,
    fontWeight: fontWeight.bold,
  },
  actionsSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  outlineBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  outlineBtnText: {
    fontSize: 17,
    fontWeight: fontWeight.semibold,
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
    fontSize: 13,
    lineHeight: 18,
  },
  dangerBtn: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  sheetContent: {
    gap: 12,
    paddingBottom: 24,
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  sheetBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  sheetBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnText: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
});
