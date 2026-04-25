import React from 'react';
import {render} from '@testing-library/react-native';

import {WalletSwitcher} from '@presentation/components/WalletSwitcher';
import {ThemeProvider} from '@shared/theme';
import type {Wallet} from '@domain/entities/Wallet';

jest.mock('@presentation/stores/useSettingsStore', () => ({
  useSettingsStore: (selector: (s: {hideAmounts: boolean}) => boolean) =>
    selector({hideAmounts: false}),
}));

jest.mock('@presentation/components/common/AppIcon', () => {
  const {Text: MockText} = require('react-native');
  return {
    AppIcon: ({name}: {name: string}) => <MockText>{name}</MockText>,
    resolveIconName: (n: string) => n,
  };
});

function makeWallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: overrides.id ?? 'w-1',
    name: overrides.name ?? 'Main',
    balance: overrides.balance ?? 100000,
    currency: overrides.currency ?? 'USD',
    icon: overrides.icon ?? 'wallet',
    color: overrides.color ?? '#6C5CE7',
    isActive: overrides.isActive ?? true,
    type: 'cash',
    createdAt: 0,
    updatedAt: 0,
    sourceTag: '',
    notes: '',
  } as unknown as Wallet;
}

describe('WalletSwitcher', () => {
  it('renders all active wallets including the All Wallets entry', () => {
    const wallets = [
      makeWallet({id: 'w-1', name: 'Main'}),
      makeWallet({id: 'w-2', name: 'Savings', currency: 'EUR'}),
      makeWallet({id: 'w-3', name: 'Travel', currency: 'GBP'}),
    ];
    const screen = render(
      <ThemeProvider>
        <WalletSwitcher
          wallets={wallets}
          totalBalance={300000}
          baseCurrency="USD"
          selectedWalletId={null}
          onSelect={() => {}}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText('All Wallets')).toBeTruthy();
    expect(screen.getByText('Main')).toBeTruthy();
    expect(screen.getByText('Savings')).toBeTruthy();
    expect(screen.getByText('Travel')).toBeTruthy();
  });

  it('uses compact balance formatting for very large amounts so the chip never truncates digits', () => {
    const wallets = [
      makeWallet({id: 'w-1', name: 'Whale', balance: 1234567890, currency: 'USD'}),
    ];
    const screen = render(
      <ThemeProvider>
        <WalletSwitcher
          wallets={wallets}
          totalBalance={1234567890}
          baseCurrency="USD"
          selectedWalletId={null}
          onSelect={() => {}}
        />
      </ThemeProvider>,
    );
    const chipNodes = screen.getAllByText(/12\.3M|\$12,345,678\.90/);
    expect(chipNodes.length).toBeGreaterThanOrEqual(1);
    for (const node of chipNodes) {
      const text = node.props.children as string;
      expect(text.length).toBeLessThan(15);
      expect(text).not.toMatch(/…|\.\.\./);
    }
  });
});
