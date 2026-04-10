import React, {Suspense} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {HomeStackParamList} from './types';
import DashboardScreen from '@presentation/screens/DashboardScreen';

const TransactionDetailScreen = React.lazy(() => import('@presentation/screens/TransactionDetailScreen'));

const Stack = createNativeStackNavigator<HomeStackParamList>();

function LazyFallback() {
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <ActivityIndicator size="small" />
    </View>
  );
}

export default function HomeStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
