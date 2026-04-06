import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {useTheme} from '@shared/theme';
import {Button} from '@presentation/components/common';
import {
  deleteStoredReceiptIfInAppDir,
  persistPickedReceipt,
} from '@shared/utils/receipt-storage';

const pickerOptions = {
  mediaType: 'photo' as const,
  quality: 0.9 as const,
  maxWidth: 2048,
  maxHeight: 2048,
  includeBase64: true,
};

export type ReceiptAttachmentFieldProps = {
  /** Used for stable filename under documents/receipts */
  storageKeyId: string;
  value: string;
  onChange: (nextUri: string) => void;
};

export function ReceiptAttachmentField({
  storageKeyId,
  value,
  onChange,
}: ReceiptAttachmentFieldProps) {
  const {colors, spacing, typography} = useTheme();
  const [busy, setBusy] = useState(false);

  const applyNewReceipt = useCallback(
    async (asset: {uri?: string; base64?: string; type?: string}) => {
      const previous = value.trim();
      setBusy(true);
      try {
        const next = await persistPickedReceipt(asset, storageKeyId);
        if (previous && previous !== next) {
          await deleteStoredReceiptIfInAppDir(previous);
        }
        onChange(next);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        Alert.alert('Receipt', message);
      } finally {
        setBusy(false);
      }
    },
    [onChange, storageKeyId, value],
  );

  const openPicker = useCallback(() => {
    Alert.alert('Attach receipt', undefined, [
      {
        text: 'Take Photo',
        onPress: () => {
          launchCamera(pickerOptions)
            .then((res) => {
              if (res.didCancel || !res.assets?.[0]) {
                return;
              }
              if (res.errorCode) {
                Alert.alert('Receipt', res.errorMessage ?? 'Could not use camera.');
                return;
              }
              return applyNewReceipt(res.assets[0]);
            })
            .catch((e) => {
              const message = e instanceof Error ? e.message : String(e);
              Alert.alert('Receipt', message);
            });
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: () => {
          launchImageLibrary(pickerOptions)
            .then((res) => {
              if (res.didCancel || !res.assets?.[0]) {
                return;
              }
              if (res.errorCode) {
                Alert.alert('Receipt', res.errorMessage ?? 'Could not open gallery.');
                return;
              }
              return applyNewReceipt(res.assets[0]);
            })
            .catch((e) => {
              const message = e instanceof Error ? e.message : String(e);
              Alert.alert('Receipt', message);
            });
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  }, [applyNewReceipt]);

  const remove = useCallback(() => {
    Alert.alert('Remove receipt', 'Remove this attachment?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          deleteStoredReceiptIfInAppDir(value)
            .then(() => {
              onChange('');
            })
            .catch((e) => {
              const message = e instanceof Error ? e.message : String(e);
              Alert.alert('Receipt', message);
            });
        },
      },
    ]);
  }, [onChange, value]);

  const hasReceipt = Boolean(value.trim());

  return (
    <View style={styles.block}>
      <Text style={[styles.label, {color: colors.textSecondary}]}>Receipt</Text>
      {hasReceipt ? (
        <View style={[styles.previewCard, {borderColor: colors.borderLight, backgroundColor: colors.surface}]}>
          <Image
            accessibilityLabel="Receipt preview"
            resizeMode="cover"
            source={{uri: value}}
            style={styles.thumb}
          />
          <View style={[styles.previewActions, {gap: spacing.sm}]}>
            <Button
              disabled={busy}
              onPress={openPicker}
              title="Change"
              variant="outline"
            />
            <Button disabled={busy} onPress={remove} title="Remove" variant="ghost" />
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityLabel="Attach receipt"
          accessibilityRole="button"
          disabled={busy}
          onPress={openPicker}
          style={({pressed}) => [
            styles.attachBox,
            {
              borderColor: colors.borderLight,
              backgroundColor: colors.surface,
              opacity: pressed || busy ? 0.85 : 1,
            },
          ]}>
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[typography.body, {color: colors.primary, fontWeight: '600'}]}>
              Attach receipt
            </Text>
          )}
          <Text style={[typography.caption, {color: colors.textTertiary, marginTop: 4}]}>
            Photo from camera or gallery
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  attachBox: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 100,
    padding: 16,
  },
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
  },
  thumb: {
    borderRadius: 8,
    height: 160,
    width: '100%',
  },
  previewActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
});
