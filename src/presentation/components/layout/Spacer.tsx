import React from 'react';
import {View} from 'react-native';

type Props = {
  size: number;
  horizontal?: boolean;
};

export function Spacer({size, horizontal = false}: Props) {
  return <View style={horizontal ? {width: size} : {height: size}} />;
}
