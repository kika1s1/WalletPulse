import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '@shared/theme';
import {fontWeight} from '@shared/theme/typography';
import {
  getDefaultTemplates,
  type TransactionTemplate,
} from '@domain/usecases/quick-action-templates';
import {AppIcon, resolveIconName} from '@presentation/components/common/AppIcon';

type Props = {
  onSelectTemplate: (template: TransactionTemplate) => void;
  onAddManual: () => void;
  onManageTemplates?: () => void;
};

const FAB_SIZE = 56;
const ITEM_HEIGHT = 48;
const SPRING_CONFIG = {damping: 18, stiffness: 280};

function hexToAlpha(hex: string, alpha: string): string {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex.trim());
  return m ? `#${m[1]}${alpha}` : hex;
}

export function QuickActionsFAB({onSelectTemplate, onAddManual, onManageTemplates}: Props) {
  const {colors, radius, shadows} = useTheme();
  const [expanded, setExpanded] = useState(false);
  const fabRotation = useSharedValue(0);
  const fabScale = useSharedValue(1);

  const templates = useMemo(() => getDefaultTemplates(), []);

  const toggle = useCallback(() => {
    setExpanded((v) => {
      const next = !v;
      fabRotation.value = withSpring(next ? 45 : 0, SPRING_CONFIG);
      return next;
    });
  }, [fabRotation]);

  const handleSelect = useCallback(
    (template: TransactionTemplate) => {
      setExpanded(false);
      fabRotation.value = withSpring(0, SPRING_CONFIG);
      onSelectTemplate(template);
    },
    [fabRotation, onSelectTemplate],
  );

  const handleManual = useCallback(() => {
    setExpanded(false);
    fabRotation.value = withSpring(0, SPRING_CONFIG);
    onAddManual();
  }, [fabRotation, onAddManual]);

  const handleManage = useCallback(() => {
    setExpanded(false);
    fabRotation.value = withSpring(0, SPRING_CONFIG);
    onManageTemplates?.();
  }, [fabRotation, onManageTemplates]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      {rotate: `${fabRotation.value}deg`},
      {scale: fabScale.value},
    ],
  }));

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel="Close quick actions"
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[StyleSheet.absoluteFill, {backgroundColor: colors.overlay}]}
          />
        </Pressable>
      )}

      {/* Menu items */}
      {expanded && (
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(260)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.menuContainer, {bottom: FAB_SIZE + 28}]}
        >
          <View
            style={[
              styles.menuCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
              },
              shadows.lg,
            ]}
          >
            <Text style={[styles.menuTitle, {color: colors.textSecondary}]}>
              QUICK ADD
            </Text>

            {templates.map((tpl, idx) => (
              <Pressable
                key={tpl.id}
                accessibilityRole="button"
                accessibilityLabel={`Quick add ${tpl.name}`}
                onPress={() => handleSelect(tpl)}
                style={({pressed}) => [
                  styles.menuItem,
                  {
                    borderBottomColor: colors.borderLight,
                    borderBottomWidth: idx < templates.length - 1 ? StyleSheet.hairlineWidth : 0,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.menuIconCircle,
                    {backgroundColor: hexToAlpha(tpl.color, '22')},
                  ]}
                >
                  <AppIcon name={resolveIconName(tpl.icon)} size={20} color={tpl.color} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text
                    style={[styles.menuItemName, {color: colors.text}]}
                    numberOfLines={1}
                  >
                    {tpl.name}
                  </Text>
                  {tpl.amount ? (
                    <Text style={[styles.menuItemMeta, {color: colors.textTertiary}]}>
                      {tpl.currency ?? ''} {((tpl.amount ?? 0) / 100).toFixed(2)}
                    </Text>
                  ) : (
                    <Text style={[styles.menuItemMeta, {color: colors.textTertiary}]}>
                      {tpl.type}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        tpl.type === 'income'
                          ? colors.successLight
                          : tpl.type === 'expense'
                            ? colors.dangerLight
                            : colors.primaryLight + '33',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      {
                        color:
                          tpl.type === 'income'
                            ? colors.success
                            : tpl.type === 'expense'
                              ? colors.danger
                              : colors.primary,
                      },
                    ]}
                  >
                    {tpl.type === 'income' ? '+' : tpl.type === 'expense' ? '-' : '~'}
                  </Text>
                </View>
              </Pressable>
            ))}

            <View style={[styles.menuFooter, {borderTopColor: colors.border}]}>
              <Pressable
                accessibilityRole="button"
                onPress={handleManual}
                style={({pressed}) => [
                  styles.footerBtn,
                  {opacity: pressed ? 0.7 : 1},
                ]}
              >
                <Text style={[styles.footerBtnText, {color: colors.primary}]}>
                  Manual entry
                </Text>
              </Pressable>
              {onManageTemplates && (
                <>
                  <View style={[styles.footerDivider, {backgroundColor: colors.border}]} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleManage}
                    style={({pressed}) => [
                      styles.footerBtn,
                      {opacity: pressed ? 0.7 : 1},
                    ]}
                  >
                    <Text style={[styles.footerBtnText, {color: colors.textSecondary}]}>
                      Manage
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {/* FAB Button */}
      <Animated.View
        style={[
          styles.fabWrap,
          shadows.lg,
          {backgroundColor: colors.primary},
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Close quick actions' : 'Open quick actions'}
          onPress={toggle}
          onPressIn={() => {
            fabScale.value = withTiming(0.9, {duration: 100});
          }}
          onPressOut={() => {
            fabScale.value = withTiming(1, {duration: 100});
          }}
          style={styles.fabPressable}
        >
          <Animated.Text style={[styles.fabIcon, fabStyle]}>+</Animated.Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 30,
    width: 260,
  },
  menuCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: ITEM_HEIGHT,
    gap: 10,
  },
  menuIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconText: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuItemContent: {
    flex: 1,
    minWidth: 0,
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: fontWeight.medium,
  },
  menuItemMeta: {
    fontSize: 11,
  },
  typeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuFooter: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  footerBtnText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
  },
  footerDivider: {
    width: StyleSheet.hairlineWidth,
  },
  fabWrap: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    zIndex: 20,
  },
  fabPressable: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 30,
  },
});
