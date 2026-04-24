/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Headless JS task — run by Android WorkManager (see
// android/app/src/main/java/com/walletpulse/recurring/RecurringWorker.kt).
// Wakes the JS runtime even when the app is killed so recurring
// transactions get auto-posted on time.
AppRegistry.registerHeadlessTask(
  'RecurringSchedulerTask',
  () => require('./src/infrastructure/recurring/headless-task').default,
);
