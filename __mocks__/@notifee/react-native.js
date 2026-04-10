const EventType = {
  PRESS: 1,
  ACTION_PRESS: 2,
  DISMISSED: 3,
  DELIVERED: 4,
  APP_BLOCKED: 5,
  CHANNEL_BLOCKED: 6,
  CHANNEL_GROUP_BLOCKED: 7,
  TRIGGER_NOTIFICATION_CREATED: 8,
};

const TriggerType = {
  TIMESTAMP: 0,
  INTERVAL: 1,
};

const AndroidImportance = {
  DEFAULT: 3,
  HIGH: 4,
  LOW: 2,
  MIN: 1,
  NONE: 0,
};

const notifee = {
  createChannel: jest.fn().mockResolvedValue(''),
  createTriggerNotification: jest.fn().mockResolvedValue(''),
  displayNotification: jest.fn().mockResolvedValue(''),
  cancelTriggerNotification: jest.fn().mockResolvedValue(undefined),
  getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
};

module.exports = {
  __esModule: true,
  default: notifee,
  EventType,
  TriggerType,
  AndroidImportance,
};
