import React, {Suspense, useMemo} from 'react';
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
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useTheme} from '@shared/theme';
import {navigationRef} from './navigationRef';

const PaywallScreen = React.lazy(
  () => import('@presentation/screens/PaywallScreen'),
);

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
  const {colors, isDark} = useTheme();

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

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Suspense fallback={<LazyFallback />}>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          {onboardingCompleted ? (
            <Stack.Screen name="MainTabs" component={TabNavigator} />
          ) : (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          )}
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{presentation: 'modal', animation: 'slide_from_bottom'}}
          />
        </Stack.Navigator>
      </Suspense>
    </NavigationContainer>
  );
}
