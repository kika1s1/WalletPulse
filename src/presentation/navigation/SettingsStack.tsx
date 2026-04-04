import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {SettingsStackParamList} from './types';
import SettingsScreen from '@presentation/screens/SettingsScreen';
import CategoryManagementScreen from '@presentation/screens/CategoryManagementScreen';
import NotificationLogScreen from '@presentation/screens/NotificationLogScreen';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <Stack.Screen name="NotificationLog" component={NotificationLogScreen} />
    </Stack.Navigator>
  );
}
