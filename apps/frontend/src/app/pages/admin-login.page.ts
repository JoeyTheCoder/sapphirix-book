import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-admin-login-page',
  standalone: true,
  imports: [FormsModule, NgIf],
  styles: [`
    .ff-input {
      display: block;
      width: 100%;
      height: 44px;
      padding: 0 12px;
      border: 1px solid var(--ff-line);
      border-radius: var(--ff-r-md);
      background: var(--ff-surface);
      font-size: 13.5px;
      color: var(--ff-ink);
      outline: none;
      transition: border-color 150ms, box-shadow 150ms;
    }
    .ff-input::placeholder { color: var(--ff-ink-faint); }
    .ff-input:focus {
      border-color: var(--ff-accent);
      box-shadow: 0 0 0 3px var(--ff-accent-soft);
    }
    .ff-input.error { border-color: var(--ff-bad); }
    .ff-btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 44px;
      background: var(--ff-ink);
      color: var(--ff-bg);
      border: none;
      border-radius: var(--ff-r-md);
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 150ms;
    }
    .ff-btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .ff-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
  template: `
    <main style="min-height:100vh; display:grid; grid-template-columns: 3fr 2fr;">

      <!-- Left panel — editorial branding -->
      <div style="background:var(--ff-bg); display:flex; flex-direction:column; justify-content:space-between; padding: 48px 64px;">
        <!-- Wordmark -->
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="assets/images/logo-textbottom.png" alt="FadeFlow" style="height:80px; width:auto;" />
        </div>

        <!-- Hero copy -->
        <div>
          <p class="ff-mono" style="font-size:11px; letter-spacing:0.16em; color:var(--ff-ink-faint); text-transform:uppercase; margin-bottom:16px;">For Swiss Coiffeurs</p>
          <h1 class="ff-display" style="font-size:44px; font-weight:400; line-height:1.05; letter-spacing:-0.02em; color:var(--ff-ink); margin:0 0 8px;">
            Appointments,<br>
            <em style="color:var(--ff-accent); font-style:italic;">beautifully</em> organised.
          </h1>
          <p style="font-size:14px; line-height:1.55; color:var(--ff-ink-muted); margin-top:16px; max-width:420px;">
            One calm place for your day's schedule, your customers, and your services.<br>No noise, no fluff.
          </p>

          <ul style="margin-top:40px; list-style:none; padding:0; display:flex; flex-direction:column; gap:16px;">
            <li style="display:flex; align-items:flex-start; gap:16px;">
              <span class="ff-mono" style="font-size:11px; color:var(--ff-accent); min-width:20px; margin-top:2px;">01</span>
              <div>
                <p style="font-size:14px; font-weight:600; color:var(--ff-ink); margin:0;">Terminbuch</p>
                <p style="font-size:13px; color:var(--ff-ink-muted); margin:2px 0 0;">Tagesplan in Echtzeit</p>
              </div>
            </li>
            <li style="display:flex; align-items:flex-start; gap:16px;">
              <span class="ff-mono" style="font-size:11px; color:var(--ff-accent); min-width:20px; margin-top:2px;">02</span>
              <div>
                <p style="font-size:14px; font-weight:600; color:var(--ff-ink); margin:0;">Online-Buchung</p>
                <p style="font-size:13px; color:var(--ff-ink-muted); margin:2px 0 0;">Öffentliche Seite unter /s/ihr-salon</p>
              </div>
            </li>
            <li style="display:flex; align-items:flex-start; gap:16px;">
              <span class="ff-mono" style="font-size:11px; color:var(--ff-accent); min-width:20px; margin-top:2px;">03</span>
              <div>
                <p style="font-size:14px; font-weight:600; color:var(--ff-ink); margin:0;">Einstellungen</p>
                <p style="font-size:13px; color:var(--ff-ink-muted); margin:2px 0 0;">Leistungen, Öffnungszeiten, Team</p>
              </div>
            </li>
          </ul>
        </div>

        <p class="ff-mono" style="font-size:11px; color:var(--ff-ink-faint);">© 2026 FadeFlow</p>
      </div>

      <!-- Right panel — login form -->
      <div style="background:var(--ff-surface); border-left:1px solid var(--ff-line); display:flex; flex-direction:column; justify-content:center; padding:48px 40px;">
        <div style="max-width:360px; width:100%;">

          <!-- Eyebrow -->
          <p class="ff-mono" style="font-size:10px; letter-spacing:0.16em; color:var(--ff-ink-faint); text-transform:uppercase; margin:0 0 12px;">Admin Zugang</p>
          <h2 class="ff-display" style="font-size:32px; font-weight:400; letter-spacing:-0.01em; color:var(--ff-ink); margin:0 0 8px;">Anmelden</h2>
          <p style="font-size:13.5px; color:var(--ff-ink-muted); margin:0 0 32px;">Nur für registrierte Salon-Administratoren.</p>

          <!-- Firebase warning -->
          <div *ngIf="!authService.isFirebaseConfigured()"
            style="margin-bottom:20px; padding:12px 14px; border:1px solid #fbbf24; border-radius:var(--ff-r-md); background:#fffbeb; font-size:13px; color:#92400e;">
            Firebase-Konfiguration fehlt. Bitte <code style="font-size:11px; background:#fef3c7; padding:1px 4px; border-radius:3px;">firebase-public.config.ts</code> aktualisieren.
          </div>

          <!-- Error -->
          <div *ngIf="errorMessage()"
            style="margin-bottom:20px; padding:12px 14px; border:1px solid var(--ff-bad); border-left:3px solid var(--ff-bad); border-radius:var(--ff-r-md); background:var(--ff-bad-soft); font-size:13px; color:var(--ff-bad);">
            {{ errorMessage() }}
          </div>

          <form (ngSubmit)="submit()" style="display:flex; flex-direction:column; gap:18px;">
            <div>
              <label class="ff-mono" style="display:block; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ff-ink-faint); margin-bottom:6px;" for="email">E-Mail Adresse</label>
              <input
                id="email"
                name="email"
                type="email"
                [(ngModel)]="email"
                class="ff-input"
                placeholder="admin@beispiel.ch"
                autocomplete="email"
                required
              />
            </div>

            <div>
              <label class="ff-mono" style="display:block; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ff-ink-faint); margin-bottom:6px;" for="password">Passwort</label>
              <input
                id="password"
                name="password"
                type="password"
                [(ngModel)]="password"
                class="ff-input"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
            </div>

            <button type="submit" class="ff-btn-primary" [disabled]="submitting() || !authService.isFirebaseConfigured()" style="margin-top:4px;">
              <i *ngIf="submitting()" class="pi pi-spin pi-spinner" style="margin-right:8px;"></i>
              {{ submitting() ? 'Anmelden…' : 'Anmelden' }}
            </button>
          </form>

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