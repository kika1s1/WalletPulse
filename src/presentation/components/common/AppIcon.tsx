import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {isBrandIcon, BrandIcon} from './BrandIcons';

export type IconFamily = 'material' | 'ionicons';

export type AppIconProps = {
  name: string;
  size?: number;
  color?: string;
  family?: IconFamily;
};

export const AppIcon = React.memo(function AppIcon({name, size = 20, color = '#000', family = 'material'}: AppIconProps) {
  if (isBrandIcon(name)) {
    return <BrandIcon name={name} size={size} color={color} />;
  }
  if (family === 'ionicons') {
    return <Ionicons name={name} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
});

export const ICON_MAP = {
  'fork-knife': 'silverware-fork-knife',
  'cart': 'cart-outline',
  'car': 'car-outline',
  'shopping-bag': 'shopping-outline',
  'film': 'movie-open-outline',
  'health': 'medical-bag',
  'home': 'home-outline',
  'lightbulb': 'lightbulb-outline',
  'briefcase': 'briefcase-outline',
  'airplane': 'airplane',
  'graduation': 'school-outline',
  'sparkle': 'auto-fix',
  'gift': 'gift-outline',
  'shield': 'shield-check-outline',
  'receipt': 'receipt',
  'cash': 'cash',
  'laptop': 'laptop',
  'trending-up': 'trending-up',
  'refresh': 'swap-horizontal',
  'coffee': 'coffee-outline',
  'star': 'star-outline',
  'music': 'music-note',
  'camera': 'camera-outline',
  'book': 'book-open-outline',
  'wrench': 'wrench-outline',
  'globe': 'earth',
  'gamepad': 'gamepad-variant-outline',
  'paw': 'paw',
  'flower': 'flower-outline',
  'soccer': 'soccer',
  'arrows-right-left': 'swap-horizontal',
  'ellipsis': 'dots-horizontal',
  'heart-pulse': 'medical-bag',
  'shopping-cart': 'cart-outline',
  'bag': 'shopping-outline',
  'graduation-cap': 'school-outline',
  'sparkles': 'auto-fix',
  'shield-check': 'shield-check-outline',
  'banknotes': 'cash',
  'expense': 'arrow-down-circle-outline',
  'income': 'arrow-up-circle-outline',
  'transfer': 'swap-horizontal',
  'wallet': 'wallet-outline',
  'palette': 'palette-outline',
  'calendar': 'calendar-outline',
  'calendar-month': 'calendar-month-outline',
  'bell': 'bell-outline',
  'chart': 'chart-bar',
  'warning': 'alert-circle-outline',
  'money': 'cash-multiple',
  'target': 'target',
  'tag': 'tag-outline',
  'lightning': 'lightning-bolt',
  'export': 'export-variant',
  'phone': 'cellphone',
  'cog': 'cog-outline',
  'credit-card': 'credit-card-outline',
  'bank': 'bank-outline',
  'inbox': 'inbox-outline',
  'search': 'magnify',
  'flag': 'flag-outline',
  'currency': 'currency-usd',
  'alert': 'alert-outline',
  'bills-due': 'calendar-clock',
  'subscription': 'sync-circle',
  'netflix': 'movie-open-outline',
  'spotify': 'music-note',
  'github': 'github',
  'cloud': 'cloud-outline',
  'adobe': 'palette',
  'investment': 'trending-up',
  'emergency': 'bank-outline',
  'vacation': 'airplane',
  'check': 'check-circle-outline',
  'info': 'information-outline',
  'close': 'close',
  'plus': 'plus',
  'chevron-right': 'chevron-right',
  'payoneer': 'payoneer',
  'grey': 'grey',
  'dukascopy': 'dukascopy',
  'brand-earth': 'brand-earth',
  'brand-mobile': 'brand-mobile',
  'brand-shield': 'brand-shield',
  'brand-contactless': 'brand-contactless',
  'brand-bitcoin': 'brand-bitcoin',
  'piggy-bank': 'piggy-bank-outline',
  'safe': 'safe',
} as const;

export type IconName = keyof typeof ICON_MAP;

export function resolveIconName(key: string): string {
  return (ICON_MAP as Record<string, string>)[key] ?? key;
}
