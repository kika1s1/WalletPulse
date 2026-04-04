import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {TabParamList} from './types';
import {useTheme} from '@shared/theme';
import HomeStack from './HomeStack';
import TransactionsStack from './TransactionsStack';
import WalletsStack from './WalletsStack';
import AnalyticsStack from './AnalyticsStack';
import SettingsStack from './SettingsStack';

const Tab = createBottomTabNavigator<TabParamList>();

type TabBarIconProps = {focused: boolean; color: string; size: number};

function createTabTextIcon(label: string) {
  return function TabBarTextIcon({color}: TabBarIconProps) {
    return <Text style={{color}}>{label}</Text>;
  };
}

const homeTabBarIcon = createTabTextIcon('home');
const transactionsTabBarIcon = createTabTextIcon('list');
const walletsTabBarIcon = createTabTextIcon('wallet');
const analyticsTabBarIcon = createTabTextIcon('chart');
const settingsTabBarIcon = createTabTextIcon('settings');

export default function TabNavigator() {
  const {colors} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: homeTabBarIcon,
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionsStack}
        options={{
          tabBarLabel: 'Transactions',
          tabBarIcon: transactionsTabBarIcon,
        }}
      />
      <Tab.Screen
        name="WalletsTab"
        component={WalletsStack}
        options={{
          tabBarLabel: 'Wallets',
          tabBarIcon: walletsTabBarIcon,
        }}
      />
      <Tab.Screen
        name="AnalyticsTab"
        component={AnalyticsStack}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: analyticsTabBarIcon,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: settingsTabBarIcon,
        }}
      />
    </Tab.Navigator>
  );
}
