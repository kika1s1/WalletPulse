import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from './types';
import SettingsScreen from '@presentation/screens/SettingsScreen';
import SetPinScreen from '@presentation/screens/SetPinScreen';
import CategoryManagementScreen from '@presentation/screens/CategoryManagementScreen';
import NotificationLogScreen from '@presentation/screens/NotificationLogScreen';
import ParsingRulesScreen from '@presentation/screens/ParsingRulesScreen';
import CreateParsingRuleScreen from '@presentation/screens/CreateParsingRuleScreen';
import CreateCategoryScreen from '@presentation/screens/CreateCategoryScreen.tsx';
import BudgetsScreen from '@presentation/screens/BudgetsScreen.tsx';
import CreateBudgetScreen from '@presentation/screens/CreateBudgetScreen.tsx';
import BudgetDetailScreen from '@presentation/screens/BudgetDetailScreen.tsx';
import TemplateManagementScreen from '@presentation/screens/TemplateManagementScreen';
import CreateTemplateScreen from '@presentation/screens/CreateTemplateScreen';
import ExportScreen from '@presentation/screens/ExportScreen';
import BillRemindersScreen from '@presentation/screens/BillRemindersScreen.tsx';
import CreateBillReminderScreen from '@presentation/screens/CreateBillReminderScreen';
import GoalsListScreen from '@presentation/screens/GoalsListScreen.tsx';
import CreateGoalScreen from '@presentation/screens/CreateGoalScreen';
import GoalDetailScreen from '@presentation/screens/GoalDetailScreen';
import SubscriptionsListScreen from '@presentation/screens/SubscriptionsListScreen.tsx';
import CreateSubscriptionScreen from '@presentation/screens/CreateSubscriptionScreen';
import TransactionDetailScreen from '@presentation/screens/TransactionDetailScreen';
import EditTransactionScreen from '@presentation/screens/EditTransactionScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="SetPin" component={SetPinScreen} />
      <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <Stack.Screen name="CreateCategory" component={CreateCategoryScreen} />
      <Stack.Screen name="NotificationLog" component={NotificationLogScreen} />
      <Stack.Screen name="ParsingRules" component={ParsingRulesScreen} />
      <Stack.Screen name="CreateParsingRule" component={CreateParsingRuleScreen} />
      <Stack.Screen name="BudgetList" component={BudgetsScreen} />
      <Stack.Screen name="CreateBudget" component={CreateBudgetScreen} />
      <Stack.Screen name="BudgetDetail" component={BudgetDetailScreen} />
      <Stack.Screen name="TemplateManagement" component={TemplateManagementScreen} />
      <Stack.Screen name="CreateTemplate" component={CreateTemplateScreen} />
      <Stack.Screen name="Export" component={ExportScreen} />
      <Stack.Screen name="BillReminders" component={BillRemindersScreen} />
      <Stack.Screen name="CreateBillReminder" component={CreateBillReminderScreen} />
      <Stack.Screen name="GoalsList" component={GoalsListScreen} />
      <Stack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <Stack.Screen name="CreateGoal" component={CreateGoalScreen} />
      <Stack.Screen name="SubscriptionsList" component={SubscriptionsListScreen} />
      <Stack.Screen name="CreateSubscription" component={CreateSubscriptionScreen} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
    </Stack.Navigator>
  );
}
