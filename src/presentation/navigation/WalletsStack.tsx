import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {WalletsStackParamList} from './types';
import WalletsScreen from '@presentation/screens/WalletsScreen';
import CreateWalletScreen from '@presentation/screens/CreateWalletScreen';
import WalletDetailScreen from '@presentation/screens/WalletDetailScreen';
import TransactionDetailScreen from '@presentation/screens/TransactionDetailScreen';
import EditTransactionScreen from '@presentation/screens/EditTransactionScreen';

const Stack = createNativeStackNavigator<WalletsStackParamList>();

export default function WalletsStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="WalletsList" component={WalletsScreen} />
      <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
      <Stack.Screen name="EditWallet" component={CreateWalletScreen} />
      <Stack.Screen name="WalletDetail" component={WalletDetailScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
    </Stack.Navigator>
  );
}
