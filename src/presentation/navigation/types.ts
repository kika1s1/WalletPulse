import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';

export type HomeStackParamList = {
  Dashboard: undefined;
  TransactionDetail: {transactionId: string};
};

export type TransactionsStackParamList = {
  TransactionsList: undefined;
  AddTransaction: {type?: 'income' | 'expense' | 'transfer'} | undefined;
  EditTransaction: {transactionId: string};
  Search: undefined;
};

export type WalletsStackParamList = {
  WalletsList: undefined;
  WalletDetail: {walletId: string};
};

export type AnalyticsStackParamList = {
  AnalyticsOverview: undefined;
  CurrencyConverter: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  CategoryManagement: undefined;
  CreateCategory: {editCategoryId?: string} | undefined;
  NotificationLog: undefined;
  BudgetList: undefined;
  CreateBudget: {editBudgetId?: string} | undefined;
  BudgetDetail: {budgetId: string};
  TemplateManagement: undefined;
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  TransactionsTab: NavigatorScreenParams<TransactionsStackParamList>;
  WalletsTab: NavigatorScreenParams<WalletsStackParamList>;
  AnalyticsTab: NavigatorScreenParams<AnalyticsStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
};

export type HomeStackScreenProps<T extends keyof HomeStackParamList> = NativeStackScreenProps<
  HomeStackParamList,
  T
>;
export type TransactionsStackScreenProps<T extends keyof TransactionsStackParamList> =
  NativeStackScreenProps<TransactionsStackParamList, T>;
export type WalletsStackScreenProps<T extends keyof WalletsStackParamList> =
  NativeStackScreenProps<WalletsStackParamList, T>;
export type AnalyticsStackScreenProps<T extends keyof AnalyticsStackParamList> =
  NativeStackScreenProps<AnalyticsStackParamList, T>;
export type SettingsStackScreenProps<T extends keyof SettingsStackParamList> =
  NativeStackScreenProps<SettingsStackParamList, T>;
export type TabScreenProps<T extends keyof TabParamList> = BottomTabScreenProps<TabParamList, T>;
