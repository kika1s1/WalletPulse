import React, {Suspense} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {TransactionsStackParamList} from './types';
import TransactionsScreen from '@presentation/screens/TransactionsScreen';

const AddTransactionScreen = React.lazy(() => import('@presentation/screens/AddTransactionScreen'));
const EditTransactionScreen = React.lazy(() => import('@presentation/screens/EditTransactionScreen'));
const SearchScreen = React.lazy(() => import('@presentation/screens/SearchScreen'));
const DuplicateCleanupScreen = React.lazy(() => import('@presentation/screens/DuplicateCleanupScreen'));

const Stack = createNativeStackNavigator<TransactionsStackParamList>();

function LazyFallback() {
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <ActivityIndicator size="small" />
    </View>
  );
}

export default function TransactionsStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="TransactionsList" component={TransactionsScreen} />
        <Stack.Screen
          name="AddTransaction"
          component={AddTransactionScreen}
          options={{presentation: 'modal'}}
        />
        <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="DuplicateCleanup" component={DuplicateCleanupScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
