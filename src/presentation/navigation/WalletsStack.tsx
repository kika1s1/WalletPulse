import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {WalletsStackParamList} from './types';
import WalletsScreen from '@presentation/screens/WalletsScreen';
import CreateWalletScreen from '@presentation/screens/CreateWalletScreen';
import WalletDetailScreen from '@presentation/screens/WalletDetailScreen';

const Stack = createNativeStackNavigator<WalletsStackParamList>();

export default function WalletsStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="WalletsList" component={WalletsScreen} />
      <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
      <Stack.Screen name="WalletDetail" component={WalletDetailScreen} />
    </Stack.Navigator>
  );
}
