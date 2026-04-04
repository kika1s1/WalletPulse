import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {
  suggestTags,
  validateTag,
  normalizeTag,
} from '@domain/usecases/tag-management';

type Props = {
  tags: string[];
  allKnownTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  testID?: string;
};

export function TagInput({
  tags,
  allKnownTags,
  onTagsChange,
  maxTags = 10,
  testID,
}: Props) {
  const {colors, spacing, radius} = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(
    () => suggestTags(draft, allKnownTags, tags),
    [draft, allKnownTags, tags],
  );

  const addTag = useCallback(
    (raw: string) => {
      const normalized = normalizeTag(raw);
      const err = validateTag(normalized);
      if (err) {
        setError(err);
        return;
      }
      if (tags.includes(normalized)) {
        setError('Tag already added');
        return;
      }
      if (tags.length >= maxTags) {
        setError(`Maximum ${maxTags} tags allowed`);
        return;
      }
      setError(null);
      onTagsChange([...tags, normalized]);
      setDraft('');
    },
    [tags, onTagsChange, maxTags],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onTagsChange(tags.filter((t) => t !== tag));
    },
    [tags, onTagsChange],
  );

  const handleSubmit = useCallback(() => {
    if (draft.trim()) {
      addTag(draft);
    }
  }, [draft, addTag]);

  const handleSuggestionPress = useCallback(
    (tag: string) => {
      addTag(tag);
      inputRef.current?.focus();
    },
    [addTag],
  );

  const handleChangeText = useCallback((text: string) => {
    setDraft(text);
    setError(null);
  }, []);

  return (
    <View style={styles.root} testID={testID}>
      <Text style={[styles.label, {color: colors.textSecondary}]}>Tags</Text>

      {tags.length > 0 && (
        <View style={styles.chipRow}>
          {tags.map((tag) => (
            <Animated.View
              key={tag}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove tag ${tag}`}
                onPress={() => removeTag(tag)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.primaryLight + '22',
                    borderColor: colors.primary + '44',
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text style={[styles.chipLabel, {color: colors.primary}]}>{tag}</Text>
                <Text style={[styles.chipRemove, {color: colors.primary}]}>x</Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      )}

      <View
        style={[
          styles.inputRow,
          {
            borderColor: focused ? colors.primary : colors.border,
            borderWidth: focused ? 2 : 1,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceElevated,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, {color: colors.text}]}
          value={draft}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setTimeout(() => {}, 200);
          }}
          placeholder={
            tags.length >= maxTags
              ? 'Tag limit reached'
              : 'Type a tag and press enter...'
          }
          placeholderTextColor={colors.textTertiary}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          editable={tags.length < maxTags}
          maxLength={30}
        />
        {draft.trim().length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={handleSubmit}
            style={[styles.addBtn, {backgroundColor: colors.primary, borderRadius: radius.xs}]}
          >
            <Text style={[styles.addBtnText, {color: '#FFFFFF'}]}>Add</Text>
          </Pressable>
        )}
      </View>

      {error && (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[styles.error, {color: colors.danger}]}
        >
          {error}
        </Text>
      )}

      {focused && suggestions.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(150)}
          style={[
            styles.suggestionsWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text style={[styles.suggestionsTitle, {color: colors.textTertiary}]}>
            Suggestions
          </Text>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsList}
            renderItem={({item}) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => handleSuggestionPress(item)}
                style={({pressed}) => [
                  styles.suggestionChip,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderRadius: radius.full,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.suggestionText, {color: colors.text}]}>{item}</Text>
              </Pressable>
            )}
          />
        </Animated.View>
      )}

      <Text style={[styles.counter, {color: colors.textTertiary}]}>
        {tags.length}/{maxTags} tags
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  chipRemove: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    height: 44,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
  },
  error: {
    fontSize: 12,
  },
  suggestionsWrap: {
    borderWidth: 1,
    padding: 8,
    gap: 6,
  },
  suggestionsTitle: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  suggestionsList: {
    gap: 6,
  },
  suggestionChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
  },
  counter: {
    fontSize: 11,
    textAlign: 'right',
  },
});
