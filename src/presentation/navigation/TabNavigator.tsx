import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
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

export default function TabNavigator() {
  const {colors, shadows} = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  const screenOptions = useMemo(() => ({
    headerShown: false as const,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textTertiary,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: 56 + bottomPadding,
      paddingBottom: bottomPadding,
      paddingTop: 6,
      ...shadows.sm,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '600' as const,
      marginTop: 2,
    },
  }), [colors, shadows, bottomPadding]);

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: homeIcon,
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStack}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: transactionsIcon,
        }}
      />
      <Tab.Screen
        name="WalletsTab"
        component={WalletsStack}
        options={{
          tabBarLabel: 'Wallets',
          tabBarIcon: walletsIcon,
        }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsStack}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: analyticsIcon,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: settingsIcon,
        }}
      />
    </Tab.Navigator>
  );
}
