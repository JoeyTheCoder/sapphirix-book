import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [NgIf, RouterLink],
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ff-footer {
      width: 100%;
      box-sizing: border-box;
      border-top: 2px solid var(--ff-line);
      background: var(--ff-surface-alt);
    }

    .ff-footer-inner {
      width: min(100%, 1200px);
      margin: 0 auto;
      box-sizing: border-box;
      padding: 36px 24px 0;
    }

    /* ── Top zone: brand + nav ── */
    .ff-footer-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px 48px;
      flex-wrap: wrap;
    }

    .ff-footer-brand {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    .ff-footer-tagline {
      margin: 0;
      font-size: 12.5px;
      color: var(--ff-ink-muted);
      line-height: 1;
    }

    .ff-footer-nav {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 18px;
      padding-top: 4px;
    }

    .ff-footer-link {
      font-size: 12.5px;
      color: var(--ff-ink-muted);
      text-decoration: none;
      transition: color 120ms;
    }

    .ff-footer-link:hover {
      color: var(--ff-accent-text);
    }

    /* ── Bottom strip: copyright + context ── */
    .ff-footer-bottom {
      margin-top: 28px;
      border-top: 1px solid var(--ff-line);
      padding: 14px 0 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px 20px;
      flex-wrap: wrap;
    }

    .ff-footer-copy,
    .ff-footer-context {
      margin: 0;
      font-size: 11.5px;
      color: var(--ff-ink-faint);
    }

    @media (max-width: 760px) {
      .ff-footer-inner {
        padding: 28px 16px 0;
        text-align: center;
      }

      .ff-footer-top {
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }

      .ff-footer-nav {
        justify-content: center;
      }

      .ff-footer-bottom {
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
    }
  `],
  template: `
    <footer class="ff-footer">
      <div class="ff-footer-inner">
        <div class="ff-footer-top">
          <div class="ff-footer-brand">
            <p class="ff-footer-tagline">Online-Terminbuchung für Schweizer Salons.</p>
          </div>
          <nav class="ff-footer-nav" aria-label="Footer Navigation">
            <a routerLink="/impressum" class="ff-footer-link">Impressum</a>
            <a routerLink="/datenschutz" class="ff-footer-link">Datenschutz</a>
            <a routerLink="/agb" class="ff-footer-link">AGB</a>
            <a routerLink="/kontakt" class="ff-footer-link">Kontakt</a>
          </nav>
        </div>
        <div class="ff-footer-bottom">
          <p class="ff-footer-copy">© 2026 {{ productName }}. Alle Rechte vorbehalten.</p>
          <p *ngIf="salonContextLine()" class="ff-footer-context">{{ salonContextLine() }}</p>
        </div>
      </div>
    </footer>
  `,
})
export class AppFooterComponent {
  @Input() productName = 'FadeFlow';
  @Input() salonName: string | null = null;
  @Input() salonPhone: string | null = null;
  @Input() salonEmail: string | null = null;

  salonContextLine(): string | null {
    if (!this.salonName) {
      return null;
    }

    const contact = this.salonPhone || this.salonEmail;

    if (!contact) {
      return null;
    }

    return `Termin bei: ${this.salonName} · ${contact}`;
  }
}