import React, {Suspense} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {WalletsStackParamList} from './types';
import WalletsScreen from '@presentation/screens/WalletsScreen';

const CreateWalletScreen = React.lazy(() => import('@presentation/screens/CreateWalletScreen'));
const WalletDetailScreen = React.lazy(() => import('@presentation/screens/WalletDetailScreen'));
const BalanceHistoryScreen = React.lazy(() => import('@presentation/screens/BalanceHistoryScreen'));
const TransactionDetailScreen = React.lazy(() => import('@presentation/screens/TransactionDetailScreen'));
const EditTransactionScreen = React.lazy(() => import('@presentation/screens/EditTransactionScreen'));

const Stack = createNativeStackNavigator<WalletsStackParamList>();

function LazyFallback() {
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <ActivityIndicator size="small" />
    </View>
  );
}

export default function WalletsStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="WalletsList" component={WalletsScreen} />
        <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
        <Stack.Screen name="EditWallet" component={CreateWalletScreen} />
        <Stack.Screen name="WalletDetail" component={WalletDetailScreen} />
        <Stack.Screen name="WalletBalanceHistory" component={BalanceHistoryScreen} />
        <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
        <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
