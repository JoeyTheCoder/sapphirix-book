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
  `],
  template: `
    <main style="min-height:100vh;background:radial-gradient(circle at top left, rgba(22,193,198,0.12), transparent 26%), radial-gradient(circle at top right, rgba(15,30,58,0.08), transparent 22%), var(--ff-bg);display:flex;align-items:center;justify-content:center;padding:32px 20px;">
      <div style="width:100%;max-width:460px;">
        <div style="display:flex;justify-content:center;margin-bottom:28px;">
          <img src="assets/images/logo-textbottom.png" alt="FadeFlow" style="height:124px;width:auto;filter:drop-shadow(0 14px 24px rgba(15,30,58,0.08));" />
        </div>

        <section style="background:rgba(255,255,255,0.88);backdrop-filter:blur(12px);border:1px solid var(--ff-line);border-radius:20px;box-shadow:0 24px 60px rgba(15,30,58,0.08);padding:32px 28px;">
          <h1 class="ff-display" style="font-size:38px; font-weight:400; letter-spacing:-0.02em; color:var(--ff-ink); margin:0 0 10px; text-align:center;">Willkommen zurück</h1>
          <p style="font-size:14px; line-height:1.55; color:var(--ff-ink-muted); margin:0 0 28px; text-align:center;">Melde dich an, um Termine, Öffnungszeiten und Einstellungen deines Salons zu verwalten.</p>

          <div *ngIf="!authService.isFirebaseConfigured()"
            style="margin-bottom:20px; padding:12px 14px; border:1px solid #fbbf24; border-radius:var(--ff-r-md); background:#fffbeb; font-size:13px; color:#92400e;">
            Firebase-Konfiguration fehlt. Bitte die öffentlichen Firebase-Werte in der Root-Umgebung ergänzen.
          </div>

          <div *ngIf="errorMessage()"
            style="margin-bottom:20px; padding:12px 14px; border:1px solid var(--ff-bad); border-left:3px solid var(--ff-bad); border-radius:var(--ff-r-md); background:var(--ff-bad-soft); font-size:13px; color:var(--ff-bad);">
            {{ errorMessage() }}
          </div>

          <form (ngSubmit)="submit()" style="display:flex; flex-direction:column; gap:18px;">
            <div>
              <label class="ff-mono" style="display:block; font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ff-ink-faint); margin-bottom:6px;" for="email">E-Mail-Adresse</label>
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

            <button type="submit" class="ff-btn-dark" [disabled]="submitting() || !authService.isFirebaseConfigured()" style="margin-top:4px;width:100%;height:44px;font-size:13.5px;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;">
              <i *ngIf="submitting()" class="pi pi-spin pi-spinner" style="margin-right:8px;"></i>
              {{ submitting() ? 'Anmelden…' : 'Anmelden' }}
            </button>
          </form>

          <p class="ff-mono" style="font-size:11px; color:var(--ff-ink-faint); text-align:center; margin:22px 0 0;">© 2026 FadeFlow</p>
        </section>
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
      const message = error instanceof Error ? error.message : 'Die Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.';
      this.errorMessage.set(this.authService.lastError() ?? message);
    } finally {
      this.submitting.set(false);
    }
  }
}