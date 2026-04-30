import {makeShouldProcessNotification} from '@shared/utils/notification-package-filter';

describe('makeShouldProcessNotification', () => {
  const monitored = ['com.payoneer.android'];

  it('allows non-builtin packages through', () => {
    const fn = makeShouldProcessNotification(monitored);
    expect(fn('com.some.other.app')).toBe(true);
  });

  it('allows builtin package when listed', () => {
    const fn = makeShouldProcessNotification(monitored);
    expect(fn('com.payoneer.android')).toBe(true);
  });

  it('blocks builtin package when not listed', () => {
    const fn = makeShouldProcessNotification(monitored);
    expect(fn('com.grey.android')).toBe(false);
  });
});
