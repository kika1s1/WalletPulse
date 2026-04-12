import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_USER_ID_KEY = '@walletpulse/app_user_id';

let cachedUserId: string | null = null;

function generateUserId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'wp_';
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export async function getOrCreateAppUserId(): Promise<string> {
  if (cachedUserId) {
    return cachedUserId;
  }

  try {
    const stored = await AsyncStorage.getItem(APP_USER_ID_KEY);
    if (stored) {
      cachedUserId = stored;
      return stored;
    }
  } catch {
    // Fall through to create new ID
  }

  const newId = generateUserId();
  cachedUserId = newId;

  try {
    await AsyncStorage.setItem(APP_USER_ID_KEY, newId);
  } catch {
    // Non-fatal: ID is cached in memory
  }

  return newId;
}
