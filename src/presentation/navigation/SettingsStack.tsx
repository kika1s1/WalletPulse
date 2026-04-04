import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from './types';
import SettingsScreen from '@presentation/screens/SettingsScreen';
import CategoryManagementScreen from '@presentation/screens/CategoryManagementScreen';
import NotificationLogScreen from '@presentation/screens/NotificationLogScreen';
import BudgetsScreen from '@presentation/screens/BudgetsScreen';
import CreateBudgetScreen from '@presentation/screens/CreateBudgetScreen';
import BudgetDetailScreen from '@presentation/screens/BudgetDetailScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <Stack.Screen name="NotificationLog" component={NotificationLogScreen} />
      <Stack.Screen name="BudgetList" component={BudgetsScreen} />
      <Stack.Screen name="CreateBudget" component={CreateBudgetScreen} />
      <Stack.Screen name="BudgetDetail" component={BudgetDetailScreen} />
    </Stack.Navigator>
  );
}
