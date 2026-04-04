import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useTheme} from '@shared/theme';

type Props = {
  marginVertical?: number;
};

export function Divider({marginVertical = 0}: Props) {
  const {colors} = useTheme();

  return (
    <View style={[styles.divider, {backgroundColor: colors.border, marginVertical}]} />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
