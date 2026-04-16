import React, {Suspense} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from './types';
import SettingsScreen from '@presentation/screens/SettingsScreen';

const ProfileScreen = React.lazy(() => import('@presentation/screens/ProfileScreen'));
const SetPinScreen = React.lazy(() => import('@presentation/screens/SetPinScreen'));
const CategoryManagementScreen = React.lazy(() => import('@presentation/screens/CategoryManagementScreen'));
const NotificationLogScreen = React.lazy(() => import('@presentation/screens/NotificationLogScreen'));
const ParsingRulesScreen = React.lazy(() => import('@presentation/screens/ParsingRulesScreen'));
const CreateParsingRuleScreen = React.lazy(() => import('@presentation/screens/CreateParsingRuleScreen'));
const CreateCategoryScreen = React.lazy(() => import('@presentation/screens/CreateCategoryScreen'));
const BudgetsScreen = React.lazy(() => import('@presentation/screens/BudgetsScreen'));
const CreateBudgetScreen = React.lazy(() => import('@presentation/screens/CreateBudgetScreen'));
const BudgetDetailScreen = React.lazy(() => import('@presentation/screens/BudgetDetailScreen'));
const TemplateManagementScreen = React.lazy(() => import('@presentation/screens/TemplateManagementScreen'));
const CreateTemplateScreen = React.lazy(() => import('@presentation/screens/CreateTemplateScreen'));
const ExportScreen = React.lazy(() => import('@presentation/screens/ExportScreen'));
const BillRemindersScreen = React.lazy(() => import('@presentation/screens/BillRemindersScreen'));
const CreateBillReminderScreen = React.lazy(() => import('@presentation/screens/CreateBillReminderScreen'));
const GoalsListScreen = React.lazy(() => import('@presentation/screens/GoalsListScreen'));
const CreateGoalScreen = React.lazy(() => import('@presentation/screens/CreateGoalScreen'));
const GoalDetailScreen = React.lazy(() => import('@presentation/screens/GoalDetailScreen'));
const SubscriptionsListScreen = React.lazy(() => import('@presentation/screens/SubscriptionsListScreen'));
const CreateSubscriptionScreen = React.lazy(() => import('@presentation/screens/CreateSubscriptionScreen'));
const TransactionDetailScreen = React.lazy(() => import('@presentation/screens/TransactionDetailScreen'));
const EditTransactionScreen = React.lazy(() => import('@presentation/screens/EditTransactionScreen'));

const Stack = createNativeStackNavigator<SettingsStackParamList>();

function LazyFallback() {
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
      <ActivityIndicator size="small" />
    </View>
  );
}

export default function SettingsStack() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="SettingsMain" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
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
    </Suspense>
  );
}
