import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {
  EventArg,
  NavigationProp,
  ParamListBase,
  Route,
} from '@react-navigation/native';
import {getFocusedRouteNameFromRoute} from '@react-navigation/native';
import type {BottomTabNavigationOptions} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {TabParamList} from './types';
import {useTheme} from '@shared/theme';
import HomeStack from './HomeStack';
import TransactionsStack from './TransactionsStack';
import WalletsStack from './WalletsStack';
import AnalyticsStack from './AnalyticsStack';
import SettingsStack from './SettingsStack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator<TabParamList>();

type TabBarIconProps = {focused: boolean; color: string; size: number};

function createTabIcon(name: string, focusedName?: string) {
  return function TabBarIcon({focused, color, size}: TabBarIconProps) {
    return (
      <MaterialCommunityIcons
        name={focused ? (focusedName ?? name) : name}
        size={size}
        color={color}
      />
    );
  };
}

const homeIcon = createTabIcon('home-outline', 'home');
const transactionsIcon = createTabIcon('swap-horizontal', 'swap-horizontal-bold');
const walletsIcon = createTabIcon('wallet-outline', 'wallet');
const analyticsIcon = createTabIcon('chart-line', 'chart-line-variant');
const settingsIcon = createTabIcon('cog-outline', 'cog');

/**
 * Routes inside any tab stack that should visually behave like full-screen
 * modals — the bottom tab bar is hidden while one of these is focused so the
 * user isn't tempted to tab-jump out of a form and silently discard data.
 */
const FULL_SCREEN_ROUTES = new Set<string>([
  'AddTransaction',
  'EditTransaction',
  'CreateWallet',
  'CreateCategory',
  'CreateBudget',
  'CreateGoal',
  'CreateSubscription',
  'CreateBillReminder',
  'CreateParsingRule',
  'CreateTemplate',
  'SetPin',
]);

type TabRoute = Route<string>;

function buildTabBarStyle(
  route: TabRoute,
  baseStyle: BottomTabNavigationOptions['tabBarStyle'],
): BottomTabNavigationOptions['tabBarStyle'] {
  const focused = getFocusedRouteNameFromRoute(route);
  if (focused && FULL_SCREEN_ROUTES.has(focused)) {
    return {display: 'none'};
  }
  return baseStyle;
}

/**
 * Shared tab-press listener that pops the pressed tab's nested stack back to
 * its root whenever there is anything deeper than the root on the stack. This
 * makes re-tapping the active tab feel like "Home again" and — more
 * importantly — makes tapping a different tab always land on that tab's root
 * screen instead of whatever sub-screen was last open.
 */
function makeTabPressListener(
  tabName: keyof TabParamList,
  rootRouteName: string,
) {
  return ({
    navigation,
  }: {
    navigation: NavigationProp<ParamListBase>;
    route: TabRoute;
  }) => ({
    tabPress: (e: EventArg<'tabPress', true, undefined>) => {
      const state = navigation.getState();
      const target = state.routes.find((r) => r.name === tabName);
      const nested = target?.state;
      if (nested && typeof nested.index === 'number' && nested.index > 0) {
        e.preventDefault();
        navigation.navigate(tabName as string, {
          screen: rootRouteName,
        } as never);
      }
    },
  });
}

const homeTabListener = makeTabPressListener('HomeTab', 'Dashboard');
const transactionsTabListener = makeTabPressListener(
  'TransactionsTab',
  'TransactionsList',
);
const walletsTabListener = makeTabPressListener('WalletsTab', 'WalletsList');
const analyticsTabListener = makeTabPressListener(
  'AnalyticsTab',
  'AnalyticsOverview',
);
const settingsTabListener = makeTabPressListener(
  'SettingsTab',
  'SettingsMain',
);

export default function TabNavigator() {
  const {colors, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  const baseTabBarStyle = useMemo<BottomTabNavigationOptions['tabBarStyle']>(
    () => ({
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: 56 + bottomPadding,
      paddingBottom: bottomPadding,
      paddingTop: 6,
      ...shadows.sm,
    }),
    [colors, shadows, bottomPadding],
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false as const,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textTertiary,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600' as const,
        marginTop: 2,
      },
    }),
    [colors],
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={({route}) => ({
          tabBarLabel: 'Home',
          tabBarIcon: homeIcon,
          tabBarStyle: buildTabBarStyle(route, baseTabBarStyle),
        })}
        listeners={homeTabListener}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStack}
        options={({route}) => ({
          tabBarLabel: 'Transactions',
          tabBarIcon: transactionsIcon,
          tabBarStyle: buildTabBarStyle(route, baseTabBarStyle),
        })}
        listeners={transactionsTabListener}
      />
      <Tab.Screen
        name="WalletsTab"
        component={WalletsStack}
        options={({route}) => ({
          tabBarLabel: 'Wallets',
          tabBarIcon: walletsIcon,
          tabBarStyle: buildTabBarStyle(route, baseTabBarStyle),
        })}
        listeners={walletsTabListener}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsStack}
        options={({route}) => ({
          tabBarLabel: 'Analytics',
          tabBarIcon: analyticsIcon,
          tabBarStyle: buildTabBarStyle(route, baseTabBarStyle),
        })}
        listeners={analyticsTabListener}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={({route}) => ({
          tabBarLabel: 'Settings',
          tabBarIcon: settingsIcon,
          tabBarStyle: buildTabBarStyle(route, baseTabBarStyle),
        })}
        listeners={settingsTabListener}
      />
    </Tab.Navigator>
  );
}
