import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '@shared/theme';

export default function NotificationLogScreen() {
  const {colors} = useTheme();
  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <Text style={[styles.title, {color: colors.text}]}>Notification Log</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 20, fontWeight: '600'},
});
