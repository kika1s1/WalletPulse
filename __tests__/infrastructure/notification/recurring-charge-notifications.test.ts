import {
  buildRecurringChargeContent,
  ensureRecurringChargeChannel,
  showRecurringChargeNotification,
} from '@infrastructure/notification/recurring-charge-notifications';

const notifee = require('@notifee/react-native').default;

describe('buildRecurringChargeContent', () => {
  it('formats income with + sign and "from <merchant>" title', () => {
    const out = buildRecurringChargeContent(
      {type: 'income', merchant: 'Acme Salary', amount: 400000, currency: 'USD', source: 'recurring'},
      'Main Wallet',
    );
    expect(out.title).toMatch(/^\+/);
    expect(out.title).toContain('Acme Salary');
    expect(out.body).toContain('Main Wallet');
    expect(out.body).toMatch(/Added to/);
  });

  it('formats expense with - sign and recurring verb', () => {
    const out = buildRecurringChargeContent(
      {type: 'expense', merchant: 'Gym', amount: 1500, currency: 'USD', source: 'recurring'},
      'Main',
    );
    expect(out.title).toMatch(/^-/);
    expect(out.title).toContain('Gym');
    expect(out.body).toMatch(/Charged/);
  });

  it('uses "Subscription charged" wording for subscription source', () => {
    const out = buildRecurringChargeContent(
      {type: 'expense', merchant: 'Netflix', amount: 1599, currency: 'USD', source: 'subscription'},
      'Main',
    );
    expect(out.body).toMatch(/Subscription charged/);
  });

  it('uses "Bill paid" wording for bill source', () => {
    const out = buildRecurringChargeContent(
      {type: 'expense', merchant: 'Rent', amount: 120000, currency: 'USD', source: 'bill'},
      'Main',
    );
    expect(out.body).toMatch(/Bill paid/);
  });

  it('falls back to a generic merchant label when blank', () => {
    const out = buildRecurringChargeContent(
      {type: 'income', merchant: '   ', amount: 100, currency: 'USD', source: 'recurring'},
      'Main',
    );
    expect(out.title).toContain('Recurring income');
  });
});

describe('showRecurringChargeNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the recurring-charges channel and displays a notification with deep-link data', async () => {
    await showRecurringChargeNotification({
      transactionId: 'tx-99',
      type: 'income',
      amount: 12345,
      currency: 'USD',
      merchant: 'Acme',
      walletId: 'wallet-1',
      walletName: 'Main',
      source: 'recurring',
    });

    expect(notifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({id: 'recurring-charges'}),
    );
    expect(notifee.displayNotification).toHaveBeenCalledTimes(1);
    const arg = notifee.displayNotification.mock.calls[0][0];
    expect(arg.id).toBe('recurring-tx-tx-99');
    expect(arg.data.type).toBe('recurring_charge');
    expect(arg.data.transactionId).toBe('tx-99');
    expect(arg.android.channelId).toBe('recurring-charges');
  });
});

describe('ensureRecurringChargeChannel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates the channel even when no notification is being shown', async () => {
    await ensureRecurringChargeChannel();
    expect(notifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({id: 'recurring-charges', name: 'Recurring Transactions'}),
    );
  });
});
