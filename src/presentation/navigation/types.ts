import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';

export type HomeStackParamList = {
  Dashboard: undefined;
  TransactionDetail: {transactionId: string};
};

export type TransactionsStackParamList = {
  TransactionsList:
    | {filterCategoryId?: string; filterWalletId?: string; filterMerchant?: string}
    | undefined;
  AddTransaction:
    | {
        type?: 'income' | 'expense' | 'transfer';
        walletId?: string;
        templateAmount?: number;
        templateCategoryId?: string;
        templateDescription?: string;
        templateMerchant?: string;
        templateCurrency?: string;
        templateTags?: string[];
      }
    | undefined;
  EditTransaction: {transactionId: string};
  Search: undefined;
  DuplicateCleanup: undefined;
};

export type WalletsStackParamList = {
  WalletsList: undefined;
  CreateWallet: {editWalletId?: string} | undefined;
  WalletDetail: {walletId: string};
  WalletBalanceHistory: {walletId: string};
  TransactionDetail: {transactionId: string};
  EditTransaction: {transactionId: string};
};

export type AnalyticsStackParamList = {
  AnalyticsOverview: undefined;
  BalanceHistory: {walletId?: string} | undefined;
  CurrencyConverter: undefined;
  SpendingAutopsy: undefined;
  MoneyLostTracker: undefined;
  CurrencyTiming: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  SetPin: undefined;
  Profile: undefined;
  CategoryManagement: undefined;
  CreateCategory: {editCategoryId?: string} | undefined;
  NotificationLog: undefined;
  ParsingRules: undefined;
  CreateParsingRule: {ruleId?: string} | undefined;
  BudgetList: undefined;
  CreateBudget: {editBudgetId?: string} | undefined;
  BudgetDetail: {budgetId: string};
  TemplateManagement: undefined;
  CreateTemplate: undefined;
  Export: undefined;
  AccountStatement: undefined;
  BillReminders: {highlightBillId?: string} | undefined;
  CreateBillReminder: {editBillId?: string} | undefined;
  GoalsList: undefined;
  CreateGoal: {editGoalId?: string} | undefined;
  GoalDetail: {goalId: string};
  SubscriptionsList: {highlightSubscriptionId?: string} | undefined;
  CreateSubscription: {editSubscriptionId?: string} | undefined;
  TransactionDetail: {transactionId: string};
  EditTransaction: {transactionId: string};
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: {email: string};
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
  Auth: NavigatorScreenParams<AuthStackParamList>;
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
export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;
export type TabScreenProps<T extends keyof TabParamList> = BottomTabScreenProps<TabParamList, T>;
