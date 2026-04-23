import React, {useMemo} from 'react';
import {Text, type TextStyle, type StyleProp} from 'react-native';
import {useTheme} from '@shared/theme';

// Renders a block of text with one or more needles highlighted. Matching
// is diacritic-insensitive and case-insensitive so it lines up with how
// Postgres scores results via unaccent() + similarity().
export type HighlightedTextProps = {
  text: string;
  needles: string[];
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type Segment = {text: string; highlight: boolean};

function splitSegments(text: string, needles: string[]): Segment[] {
  const cleaned = needles
    .map((n) => n.trim())
    .filter((n) => n.length >= 1);
  if (cleaned.length === 0 || !text) {
    return [{text, highlight: false}];
  }

  // Work on the normalised copy for matching but slice the original so
  // the output keeps its original casing and diacritics.
  const lower = normalise(text);
  const pattern = new RegExp(
    cleaned.map(escapeRegex).map(normalise).join('|'),
    'g',
  );

  const segments: Segment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(lower)) !== null) {
    if (match.index === pattern.lastIndex) {
      // Zero-width match guard.
      pattern.lastIndex += 1;
      continue;
    }
    if (match.index > cursor) {
      segments.push({text: text.slice(cursor, match.index), highlight: false});
    }
    segments.push({
      text: text.slice(match.index, match.index + match[0].length),
      highlight: true,
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    segments.push({text: text.slice(cursor), highlight: false});
  }
  return segments;
}

export function HighlightedText({
  text,
  needles,
  style,
  highlightStyle,
  numberOfLines,
}: HighlightedTextProps) {
  const {colors} = useTheme();
  const segments = useMemo(() => splitSegments(text, needles), [text, needles]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) => (
        seg.highlight ? (
          <Text
            key={i}
            style={[
              {
                backgroundColor: colors.warning + '33',
                color: colors.text,
                fontWeight: '700',
              },
              highlightStyle,
            ]}>
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        )
      ))}
    </Text>
  );
}
