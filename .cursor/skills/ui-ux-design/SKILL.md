---
name: ui-ux-design
description: Enterprise UI/UX design system for WalletPulse. Covers component patterns, state handling, animations, accessibility, and human-centered design. Use when building screens, creating components, designing layouts, or improving user experience.
---

# UI/UX Design System Skill

## Design Vision

WalletPulse competes with top expense trackers through a clean, fast, human-centered interface. Every screen feels instant. Every interaction has feedback. Every state (loading, empty, error) is designed.

## Component Library

### Common Components (`src/presentation/components/common/`)

| Component | Usage |
|-----------|-------|
| Button | Primary, secondary, outline, danger, ghost variants |
| Card | Surface container with shadow, press animation |
| Input | Text, numeric, search with floating label |
| Modal | Full and half sheet with slide animation |
| CurrencyPicker | Searchable bottom sheet with flag icons |
| CategoryPicker | Grid layout with colored icons |
| AmountInput | Large numeric display with currency symbol |
| Badge | Status indicators (count, dot, label) |
| Chip | Filterable tag with remove action |
| Toggle | Animated switch with haptic feedback |
| DatePicker | Calendar and quick range selection |

### Feedback Components (`src/presentation/components/feedback/`)

| Component | Usage |
|-----------|-------|
| Skeleton | Shimmer placeholder matching content layout |
| EmptyState | Illustration + message + action button |
| ErrorState | Error icon + message + retry button |
| Toast | Success/error/info notification bar |
| LoadingOverlay | Semi-transparent overlay with spinner |
| PullToRefresh | Custom animated refresh indicator |

### Layout Components (`src/presentation/components/layout/`)

| Component | Usage |
|-----------|-------|
| ScreenContainer | Safe area + scroll view + pull-to-refresh |
| SectionHeader | Title + optional action button |
| Divider | Thin separator line with spacing |
| Spacer | Flexible spacing component |

## Screen Design Template

Every screen follows this structure:

```tsx
import React from 'react';
import { ScreenContainer } from '@presentation/components/layout';
import { Skeleton, EmptyState, ErrorState } from '@presentation/components/feedback';

export default function ExampleScreen() {
  const { data, isLoading, error, refetch } = useExampleData();

  if (isLoading) return <ExampleSkeleton />;
  if (error) return <ErrorState message="Could not load data" onRetry={refetch} />;
  if (data.length === 0) return <EmptyState type="example" />;

  return (
    <ScreenContainer onRefresh={refetch}>
      {/* Screen content */}
    </ScreenContainer>
  );
}
```

## Animation Recipes

### Card Press
```ts
const scale = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));
const onPressIn = () => { scale.value = withSpring(0.97); };
const onPressOut = () => { scale.value = withSpring(1); };
```

### List Item Entrance
```ts
const entering = FadeInDown.delay(index * 50).springify();
```

### Bottom Sheet Open
```ts
const translateY = useSharedValue(screenHeight);
const open = () => { translateY.value = withSpring(0, { damping: 20 }); };
```

## Accessibility Checklist

- [ ] Every touchable has `accessibilityLabel` and `accessibilityRole`
- [ ] Minimum 44x44pt touch targets
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Screen reader announces amounts with currency
- [ ] Dynamic font scaling works on all text
- [ ] Focus order is logical (top to bottom, left to right)

## Dashboard Layout Reference

```
┌──────────────────────────────────┐
│  Greeting + date                  │
├──────────────────────────────────┤
│  Total Balance Card (large)       │
│  Base currency amount, +/- %      │
├──────────────────────────────────┤
│  Income / Expense pills           │
│  [  +$2,400  ]  [  -$1,200  ]   │
├──────────────────────────────────┤
│  Quick Actions row                │
│  [Add] [Transfer] [Scan] [More]  │
├──────────────────────────────────┤
│  Mini spending chart (7 day bar)  │
├──────────────────────────────────┤
│  Recent Transactions              │
│  TransactionCard x 5              │
│  "See All" link                   │
├──────────────────────────────────┤
│  Insight Cards (horizontal scroll)│
│  "You spent 20% more on Food"     │
└──────────────────────────────────┘
```
