import React, {Suspense} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {AnalyticsStackParamList} from './types';
import AnalyticsScreen from '@presentation/screens/AnalyticsScreen';

const BalanceHistoryScreen = React.lazy(() => import('@presentation/screens/BalanceHistoryScreen'));
const CurrencyConverterScreen = React.lazy(() => import('@presentation/screens/CurrencyConverterScreen'));
const SpendingAutopsyScreen = React.lazy(() => import('@presentation/screens/SpendingAutopsyScreen'));
const MoneyLostTrackerScreen = React.lazy(() => import('@presentation/screens/MoneyLostTrackerScreen'));
const CurrencyTimingScreen = React.lazy(() => import('@presentation/screens/CurrencyTimingScreen'));

const Stack = createNativeStackNavigator<AnalyticsStackParamList>();

function LazyFallback() {
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <ActivityIndicator size="small" />
    </View>
  );
}

export default function AnalyticsStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="AnalyticsOverview" component={AnalyticsScreen} />
        <Stack.Screen name="BalanceHistory" component={BalanceHistoryScreen} />
        <Stack.Screen name="CurrencyConverter" component={CurrencyConverterScreen} />
        <Stack.Screen name="SpendingAutopsy" component={SpendingAutopsyScreen} />
        <Stack.Screen name="MoneyLostTracker" component={MoneyLostTrackerScreen} />
        <Stack.Screen name="CurrencyTiming" component={CurrencyTimingScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
