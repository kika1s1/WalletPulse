import React, {useEffect, useState} from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import OnboardingScreen from '@presentation/screens/OnboardingScreen';
import TabNavigator from './TabNavigator';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';
import {useTheme} from '@shared/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

function useHydrated() {
  const [hydrated, setHydrated] = useState(useSettingsStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    const unsub = useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, [hydrated]);

  return hydrated;
}

export default function AppNavigator() {
  const hydrated = useHydrated();
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const {colors} = useTheme();

  if (!hydrated) {
    return (
      <View style={[styles.splash, {backgroundColor: colors.background}]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={onboardingCompleted ? 'MainTabs' : 'Onboarding'}
        screenOptions={{headerShown: false}}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="MainTabs" component={TabNavigator} options={{headerShown: false}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
