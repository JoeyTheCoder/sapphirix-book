import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';

import type { AdminProfile } from './auth.types';
import { ensureFirebaseBrowserPersistence, firebaseAuth } from './firebase-client';
import { frontendEnv } from './frontend-env';
import { isFirebasePublicConfigReady } from './firebase-public.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly initPromise: Promise<void>;

  readonly currentUser = signal<User | null>(null);
  readonly adminProfile = signal<AdminProfile | null>(null);
  readonly initialized = signal(false);
  readonly lastError = signal<string | null>(null);

  constructor() {
    this.initPromise = (async () => {
      if (!firebaseAuth) {
        this.initialized.set(true);
        return;
      }

      const auth = firebaseAuth;

      onAuthStateChanged(auth, (user) => {
        this.currentUser.set(user);

        if (!user) {
          this.adminProfile.set(null);
        }
      });

      try {
        await ensureFirebaseBrowserPersistence();
        await auth.authStateReady();
        this.currentUser.set(auth.currentUser);
      } finally {
        this.initialized.set(true);
      }
    })();
  }

  isFirebaseConfigured(): boolean {
    return isFirebasePublicConfigReady() && !!firebaseAuth;
  }

  async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  async signIn(email: string, password: string): Promise<AdminProfile> {
    if (!firebaseAuth) {
      throw new Error('Firebase is not configured yet. Fill in the Firebase public config first.');
    }

    this.lastError.set(null);
    await ensureFirebaseBrowserPersistence();
    await signInWithEmailAndPassword(firebaseAuth, email, password);

    const profile = await this.fetchAdminProfile();
    await this.router.navigateByUrl('/admin');
    return profile;
  }

  async signOut(): Promise<void> {
    if (firebaseAuth) {
      await signOut(firebaseAuth);
    }

    this.adminProfile.set(null);
    await this.router.navigateByUrl('/admin/login');
  }

  async fetchAdminProfile(): Promise<AdminProfile> {
    return this.fetchAdminProfileWithRetry(false);
  }

  private async fetchAdminProfileWithRetry(forceRefreshToken: boolean): Promise<AdminProfile> {
    const user = firebaseAuth?.currentUser;

    if (!user) {
      throw new Error('No authenticated admin found.');
    }

    const idToken = await user.getIdToken(forceRefreshToken);

    try {
      const profile = await firstValueFrom(
        this.http.get<AdminProfile>(`${frontendEnv.apiBaseUrl}/admin/me`, {
          headers: new HttpHeaders({
            Authorization: `Bearer ${idToken}`,
          }),
        }),
      );

      this.adminProfile.set(profile);
      return profile;
    } catch (error: unknown) {
      const maybeHttpError = error as HttpErrorResponse;

      if (!forceRefreshToken && (maybeHttpError.status === 401 || maybeHttpError.status === 403)) {
        return this.fetchAdminProfileWithRetry(true);
      }

      if (maybeHttpError.status === 401 || maybeHttpError.status === 403) {
        this.lastError.set(
          maybeHttpError.status === 403
            ? 'Access denied. Contact the system admin.'
            : 'Your admin session expired. Please sign in again.',
        );
        await this.signOut();
      }

      throw error;
    }
  }
}