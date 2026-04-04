import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from './types';
import SettingsScreen from '@presentation/screens/SettingsScreen';
import CategoryManagementScreen from '@presentation/screens/CategoryManagementScreen';
import NotificationLogScreen from '@presentation/screens/NotificationLogScreen';
import CreateCategoryScreen from '@presentation/screens/CreateCategoryScreen.tsx';
import BudgetsScreen from '@presentation/screens/BudgetsScreen.tsx';
import CreateBudgetScreen from '@presentation/screens/CreateBudgetScreen.tsx';
import BudgetDetailScreen from '@presentation/screens/BudgetDetailScreen.tsx';
import TemplateManagementScreen from '@presentation/screens/TemplateManagementScreen';
import ExportScreen from '@presentation/screens/ExportScreen';
import BillRemindersScreen from '@presentation/screens/BillRemindersScreen.tsx';
import GoalsListScreen from '@presentation/screens/GoalsListScreen.tsx';
import SubscriptionsListScreen from '@presentation/screens/SubscriptionsListScreen.tsx';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <Stack.Screen name="CreateCategory" component={CreateCategoryScreen} />
      <Stack.Screen name="NotificationLog" component={NotificationLogScreen} />
      <Stack.Screen name="BudgetList" component={BudgetsScreen} />
      <Stack.Screen name="CreateBudget" component={CreateBudgetScreen} />
      <Stack.Screen name="BudgetDetail" component={BudgetDetailScreen} />
      <Stack.Screen name="TemplateManagement" component={TemplateManagementScreen} />
      <Stack.Screen name="Export" component={ExportScreen} />
      <Stack.Screen name="BillReminders" component={BillRemindersScreen} />
      <Stack.Screen name="GoalsList" component={GoalsListScreen} />
      <Stack.Screen name="SubscriptionsList" component={SubscriptionsListScreen} />
    </Stack.Navigator>
  );
}
