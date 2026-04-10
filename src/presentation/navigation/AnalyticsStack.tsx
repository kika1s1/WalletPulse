import React, {Suspense} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {AnalyticsStackParamList} from './types';
import AnalyticsScreen from '@presentation/screens/AnalyticsScreen';

const CurrencyConverterScreen = React.lazy(() => import('@presentation/screens/CurrencyConverterScreen'));

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
        <Stack.Screen name="CurrencyConverter" component={CurrencyConverterScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
