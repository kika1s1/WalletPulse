import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import OnboardingScreen from '@presentation/screens/OnboardingScreen';
import TabNavigator from './TabNavigator';
import {useSettingsStore} from '@presentation/stores/useSettingsStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);

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
