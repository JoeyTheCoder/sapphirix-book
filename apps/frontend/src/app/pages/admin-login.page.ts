import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-admin-login-page',
  standalone: true,
  imports: [FormsModule, NgIf, ButtonModule, PasswordModule],
  template: `
    <main class="min-h-screen lg:grid lg:grid-cols-[1fr_1fr]">

      <!-- Left panel — gradient branding (desktop only) -->
      <div class="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 p-12 text-white">
        <!-- Decorative blobs -->
        <div class="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/5 blur-3xl"></div>
        <div class="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-fuchsia-400/15 blur-3xl"></div>

        <!-- Wordmark -->
        <div class="relative flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
            <i class="pi pi-sparkles text-lg"></i>
          </div>
          <span class="text-xl font-bold tracking-tight">Sapphirix</span>
        </div>

        <!-- Hero copy -->
        <div class="relative">
          <h1 class="text-4xl font-bold leading-tight">Manage your salon beautifully.</h1>
          <p class="mt-4 text-lg leading-relaxed text-violet-100">Services, schedules, and bookings — all in one place.</p>

          <!-- Feature list -->
          <ul class="mt-10 space-y-4">
            <li class="flex items-center gap-3 text-sm text-violet-100">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                <i class="pi pi-calendar text-xs"></i>
              </div>
              Real-time booking management
            </li>
            <li class="flex items-center gap-3 text-sm text-violet-100">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                <i class="pi pi-sliders-h text-xs"></i>
              </div>
              Full salon configuration control
            </li>
            <li class="flex items-center gap-3 text-sm text-violet-100">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                <i class="pi pi-lock text-xs"></i>
              </div>
              Secure, per-salon access control
            </li>
          </ul>
        </div>

        <p class="relative text-xs text-violet-300">© 2026 Sapphirix</p>
      </div>

      <!-- Right panel — form -->
      <div class="flex min-h-screen flex-col items-center justify-center bg-white px-8 py-12 lg:px-14">
        <div class="w-full max-w-sm">

          <!-- Mobile header (hidden on desktop) -->
          <div class="mb-8 text-center lg:hidden">
            <div class="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25">
              <i class="pi pi-sparkles text-2xl"></i>
            </div>
            <h1 class="text-2xl font-bold text-gray-900">Sapphirix Admin</h1>
            <p class="mt-1.5 text-sm text-gray-500">Sign in to manage your salon</p>
          </div>

          <!-- Desktop heading -->
          <div class="mb-8 hidden lg:block">
            <h2 class="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p class="mt-2 text-sm text-gray-500">Sign in to your admin account to continue</p>
          </div>

          <!-- Firebase warning -->
          <div *ngIf="!authService.isFirebaseConfigured()" class="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
            <i class="pi pi-exclamation-triangle mt-0.5 shrink-0 text-amber-600"></i>
            <p>Firebase config is missing. Update <code class="rounded bg-amber-100 px-1 py-0.5 text-xs font-mono">firebase-public.config.ts</code> first.</p>
          </div>

          <!-- Error -->
          <div *ngIf="errorMessage()" class="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800">
            <i class="pi pi-times-circle mt-0.5 shrink-0 text-red-500"></i>
            <p>{{ errorMessage() }}</p>
          </div>

          <form class="space-y-5" (ngSubmit)="submit()">
            <div>
              <label class="mb-1.5 block text-sm font-semibold text-gray-700" for="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                [(ngModel)]="email"
                class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15"
                placeholder="admin@example.com"
                autocomplete="email"
                required
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-semibold text-gray-700" for="password">Password</label>
              <p-password
                inputId="password"
                name="password"
                [(ngModel)]="password"
                [feedback]="false"
                [toggleMask]="true"
                styleClass="w-full"
                inputStyleClass="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
              ></p-password>
            </div>

            <!-- Gradient submit button -->
            <button
              type="submit"
              [disabled]="submitting() || !authService.isFirebaseConfigured()"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 outline-none transition-all hover:brightness-110 hover:shadow-violet-500/30 focus:ring-3 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <i [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-sign-in'"></i>
              <span>{{ submitting() ? 'Signing in…' : 'Sign in' }}</span>
            </button>
          </form>

          <p class="mt-8 text-center text-xs text-gray-400">
            Access is restricted to registered salon administrators.
          </p>
        </div>
      </div>
    </main>
  `,
})
export class AdminLoginPage {
  readonly authService = inject(AuthService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(this.authService.lastError());

  email = '';
  password = '';

  async submit(): Promise<void> {
    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.signIn(this.email, this.password);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign in failed. Please try again.';
      this.errorMessage.set(this.authService.lastError() ?? message);
    } finally {
      this.submitting.set(false);
    }
  }
}