let store = null;

module.exports = {
  setGenericPassword: jest.fn(async (username, password) => {
    store = {username, password};
    return true;
  }),
  getGenericPassword: jest.fn(async () => {
    return store || false;
  }),
  resetGenericPassword: jest.fn(async () => {
    store = null;
    return true;
  }),
  SECURITY_LEVEL: {
    ANY: 'ANY',
    SECURE_SOFTWARE: 'SECURE_SOFTWARE',
    SECURE_HARDWARE: 'SECURE_HARDWARE',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
    AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
    ALWAYS: 'ALWAYS',
  },
  __resetStore: () => {
    store = null;
  },
};
