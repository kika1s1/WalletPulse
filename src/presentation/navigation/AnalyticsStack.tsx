import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {AnalyticsStackParamList} from './types';
import AnalyticsScreen from '@presentation/screens/AnalyticsScreen';
import CurrencyConverterScreen from '@presentation/screens/CurrencyConverterScreen';

const Stack = createNativeStackNavigator<AnalyticsStackParamList>();

export default function AnalyticsStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="AnalyticsOverview" component={AnalyticsScreen} />
      <Stack.Screen name="CurrencyConverter" component={CurrencyConverterScreen} />
    </Stack.Navigator>
  );
}
