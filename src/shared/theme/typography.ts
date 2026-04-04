import {TextStyle} from 'react-native';

export const fontSize = {
  caption: 11,
  footnote: 13,
  body: 15,
  callout: 16,
  headline: 17,
  title3: 20,
  title2: 22,
  title1: 28,
  largeTitle: 34,
} as const;

export const fontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

export const typography = {
  largeTitle: {fontSize: fontSize.largeTitle, fontWeight: fontWeight.bold, lineHeight: 41},
  title1: {fontSize: fontSize.title1, fontWeight: fontWeight.bold, lineHeight: 34},
  title2: {fontSize: fontSize.title2, fontWeight: fontWeight.bold, lineHeight: 28},
  title3: {fontSize: fontSize.title3, fontWeight: fontWeight.semibold, lineHeight: 25},
  headline: {fontSize: fontSize.headline, fontWeight: fontWeight.semibold, lineHeight: 22},
  callout: {fontSize: fontSize.callout, fontWeight: fontWeight.regular, lineHeight: 21},
  body: {fontSize: fontSize.body, fontWeight: fontWeight.regular, lineHeight: 20},
  footnote: {fontSize: fontSize.footnote, fontWeight: fontWeight.regular, lineHeight: 18},
  caption: {fontSize: fontSize.caption, fontWeight: fontWeight.regular, lineHeight: 13},
} as const;
