import React, {Suspense, useEffect, useMemo} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import OnboardingScreen from '@presentation/screens/OnboardingScreen';
import TabNavigator from './TabNavigator';
import AuthStack from './AuthStack';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useAuth} from '@presentation/hooks/useAuth';
import {useTheme} from '@shared/theme';
import {navigationRef} from './navigationRef';
import {getSupabaseDataSource, resetSupabaseDataSource, isDataSourceReady} from '@data/datasources/SupabaseDataSource';
import {seedDefaultCategories, isCategorySeeded} from '@data/seed/categories';
import {makeCreateWallet} from '@domain/usecases/create-wallet';
import {generateId} from '@shared/utils/hash';
import {pullSettingsFromSupabase, startSettingsSync, stopSettingsSync} from '@data/sync/settings-sync';

function LazyFallback() {
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const {isAuthenticated, isInitialized, user} = useAuth();
  const {colors, isDark} = useTheme();

  // Prime the data source singleton synchronously during render.
  // Child screens (TabNavigator -> useDashboard/useWallets/...) run their
  // mount effects BEFORE this component's useEffect fires, so deferring this
  // to useEffect causes a "requires userId on first call" throw. The call is
  // idempotent: once cachedUserId matches, it returns the existing instance.
  if (isAuthenticated && user?.id) {
    getSupabaseDataSource(user.id);
  }

  useEffect(() => {
    // Only tear down the singleton on actual logout. We intentionally do not
    // reset in the cleanup of this effect because any transient dep change
    // (fast refresh, user.id identity flicker) would nuke the instance while
    // children still hold references to it and throw on their next read.
    if (!isAuthenticated || !user?.id) {
      resetSupabaseDataSource();
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      return;
    }
    if (useSettingsStore.getState().onboardingCompleted) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        if (cancelled || !isDataSourceReady()) {
          return;
        }
        await pullSettingsFromSupabase();
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !onboardingCompleted) { return; }

    let cancelled = false;

    (async () => {
      const alreadySeeded = await isCategorySeeded(user.id);
      if (!alreadySeeded) {
        try {
          const ds = getSupabaseDataSource(user.id);
          const {onboardingCurrency} = useSettingsStore.getState();
          await seedDefaultCategories(user.id);
          const create = makeCreateWallet({walletRepo: ds.wallets});
          const now = Date.now();
          await create({
            id: generateId(),
            name: 'Main Account',
            currency: onboardingCurrency || 'USD',
            balance: 0,
            isActive: true,
            icon: 'wallet',
            color: '#6C5CE7',
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
          });
        } catch {
          // wallet/categories may already exist
        }
        if (!cancelled) {
          useSettingsStore.getState().setPendingSeedComplete(true);
        }
      }

      await pullSettingsFromSupabase();
      if (!cancelled) {
        startSettingsSync();
      }
    })();

    return () => {
      cancelled = true;
      stopSettingsSync();
    };
  }, [isAuthenticated, user?.id, onboardingCompleted]);

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [colors, isDark]);

  if (!isInitialized) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background}}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Suspense fallback={<LazyFallback />}>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          {!isAuthenticated ? (
            <Stack.Screen name="Auth" component={AuthStack} />
          ) : !onboardingCompleted ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : (
            <Stack.Screen name="MainTabs" component={TabNavigator} />
          )}
        </Stack.Navigator>
      </Suspense>
    </NavigationContainer>
  );
}
