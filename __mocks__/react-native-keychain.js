const stores = new Map();

function resolveService(options) {
  if (!options) {
    return '__default__';
  }
  if (typeof options === 'string') {
    return options;
  }
  return options.service || '__default__';
}

module.exports = {
  setGenericPassword: jest.fn(async (username, password, options) => {
    const service = resolveService(options);
    stores.set(service, {username, password, service});
    return true;
  }),
  getGenericPassword: jest.fn(async (options) => {
    const service = resolveService(options);
    const entry = stores.get(service);
    return entry || false;
  }),
  hasGenericPassword: jest.fn(async (options) => {
    const service = resolveService(options);
    return stores.has(service);
  }),
  resetGenericPassword: jest.fn(async (options) => {
    const service = resolveService(options);
    stores.delete(service);
    return true;
  }),
  getSupportedBiometryType: jest.fn(async () => null),
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
  ACCESS_CONTROL: {
    BIOMETRY_ANY: 'BIOMETRY_ANY',
    BIOMETRY_CURRENT_SET: 'BIOMETRY_CURRENT_SET',
    BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BIOMETRY_ANY_OR_DEVICE_PASSCODE',
  },
  BIOMETRY_TYPE: {
    FACE: 'Face',
    FINGERPRINT: 'Fingerprint',
    IRIS: 'Iris',
    FACE_ID: 'FaceID',
    TOUCH_ID: 'TouchID',
  },
  __resetStore: () => {
    stores.clear();
  },
};
