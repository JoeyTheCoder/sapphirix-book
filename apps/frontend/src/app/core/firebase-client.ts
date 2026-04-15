import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';

import { firebasePublicConfig, isFirebasePublicConfigReady } from './firebase-public.config';

export const firebaseApp = isFirebasePublicConfigReady() ? initializeApp(firebasePublicConfig) : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;

export async function ensureFirebaseBrowserPersistence(): Promise<void> {
  if (!firebaseAuth) {
    return;
  }

  await setPersistence(firebaseAuth, browserLocalPersistence);
}