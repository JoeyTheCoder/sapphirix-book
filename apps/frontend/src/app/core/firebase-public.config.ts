import { frontendEnv } from './frontend-env';

export const firebasePublicConfig = frontendEnv.firebasePublicConfig;

export function isFirebasePublicConfigReady(): boolean {
  return Object.values(firebasePublicConfig).every((value) => value.trim().length > 0);
}