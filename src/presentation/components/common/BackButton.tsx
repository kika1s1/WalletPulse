import React from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '@shared/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type BackButtonProps = {
  onPress?: () => void;
  icon?: 'back' | 'close';
};

export function BackButton({onPress, icon = 'back'}: BackButtonProps) {
  const navigation = useNavigation();
  const {colors} = useTheme();

  const iconName = icon === 'close' ? 'close' : 'chevron-left';

  return (
    <Pressable
      accessibilityLabel={icon === 'close' ? 'Close' : 'Go back'}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress ?? (() => navigation.goBack())}
      style={({pressed}) => [styles.container, {opacity: pressed ? 0.5 : 1}]}>
      <MaterialCommunityIcons name={iconName} size={28} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
