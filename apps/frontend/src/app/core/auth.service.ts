import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';

import type { AdminProfile } from './auth.types';
import { ensureFirebaseBrowserPersistence, firebaseAuth } from './firebase-client';
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
    this.initPromise = new Promise((resolve) => {
      if (!firebaseAuth) {
        this.initialized.set(true);
        resolve();
        return;
      }

      const auth = firebaseAuth;

      let firstEventHandled = false;

      void ensureFirebaseBrowserPersistence().finally(() => {
        onAuthStateChanged(auth, (user) => {
          this.currentUser.set(user);

          if (!user) {
            this.adminProfile.set(null);
          }

          if (!firstEventHandled) {
            firstEventHandled = true;
            this.initialized.set(true);
            resolve();
          }
        });
      });
    });
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
    const user = firebaseAuth?.currentUser;

    if (!user) {
      throw new Error('No authenticated admin found.');
    }

    const idToken = await user.getIdToken();

    try {
      const profile = await firstValueFrom(
        this.http.get<AdminProfile>('http://localhost:3000/api/v1/admin/me', {
          headers: new HttpHeaders({
            Authorization: `Bearer ${idToken}`,
          }),
        }),
      );

      this.adminProfile.set(profile);
      return profile;
    } catch (error: unknown) {
      const maybeHttpError = error as { status?: number };

      if (maybeHttpError.status === 403) {
        this.lastError.set('Access denied. Contact the system admin.');
        await this.signOut();
      }

      throw error;
    }
  }
}