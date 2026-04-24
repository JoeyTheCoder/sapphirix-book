import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [NgIf, RouterLink],
  styles: [`
    .ff-footer {
      border-top: 1px solid var(--ff-line);
      background: rgba(255, 255, 255, 0.56);
    }

    .ff-footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 18px 24px 22px;
    }

    .ff-footer-context {
      margin: 0 0 10px;
      font-size: 12px;
      color: var(--ff-ink-muted);
    }

    .ff-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px 20px;
      flex-wrap: wrap;
    }

    .ff-footer-copy,
    .ff-footer-note {
      margin: 0;
      font-size: 12px;
      color: var(--ff-ink-faint);
    }

    .ff-footer-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
    }

    .ff-footer-link {
      font-size: 12px;
      color: var(--ff-ink-muted);
      text-decoration: none;
      transition: color 120ms;
    }

    .ff-footer-link:hover {
      color: var(--ff-ink);
    }

    .ff-footer-note {
      margin-top: 8px;
    }

    @media (max-width: 760px) {
      .ff-footer-inner {
        padding: 16px;
      }
    }
  `],
  template: `
    <footer class="ff-footer">
      <div class="ff-footer-inner">
        <p *ngIf="salonContextLine()" class="ff-footer-context">{{ salonContextLine() }}</p>
        <div class="ff-footer-row">
          <p class="ff-footer-copy">© 2026 {{ productName }}. Alle Rechte vorbehalten.</p>
          <nav class="ff-footer-nav" aria-label="Footer Navigation">
            <a routerLink="/impressum" class="ff-footer-link">Impressum</a>
            <a routerLink="/datenschutz" class="ff-footer-link">Datenschutz</a>
            <a routerLink="/agb" class="ff-footer-link">AGB</a>
            <a routerLink="/kontakt" class="ff-footer-link">Kontakt</a>
          </nav>
        </div>
        <p class="ff-footer-note">Online-Terminbuchung für Schweizer Salons.</p>
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