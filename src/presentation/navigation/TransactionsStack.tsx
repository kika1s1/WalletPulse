import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {TransactionsStackParamList} from './types';
import TransactionsScreen from '@presentation/screens/TransactionsScreen';
import AddTransactionScreen from '@presentation/screens/AddTransactionScreen';
import EditTransactionScreen from '@presentation/screens/EditTransactionScreen';
import SearchScreen from '@presentation/screens/SearchScreen';

const Stack = createNativeStackNavigator<TransactionsStackParamList>();

export default function TransactionsStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="TransactionsList" component={TransactionsScreen} />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{presentation: 'modal'}}
      />
      <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
    </Stack.Navigator>
  );
}
