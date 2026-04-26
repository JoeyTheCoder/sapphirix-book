import { NgFor } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { AppFooterComponent } from '../shared/app-footer.component';

type LegalPageKey = 'impressum' | 'datenschutz' | 'agb' | 'kontakt';

type LegalPageContent = {
  eyebrow: string;
  title: string;
  lead: string;
  blocks: Array<{
    heading: string;
    body: string;
  }>;
};

// TODO: Replace all placeholder legal copy and company/operator data before production.
const legalContent: Record<LegalPageKey, LegalPageContent> = {
  impressum: {
    eyebrow: 'RECHTLICHES',
    title: 'Impressum',
    lead: '',
    blocks: [
      {
        heading: 'Betreiber',
        body: 'Joel Sahli',
      },
      {
        heading: 'Kontakt',
        body: 'E-Mail: legal@fadeflow.ch',
      },
    ],
  },
  datenschutz: {
    eyebrow: 'RECHTLICHES',
    title: 'Datenschutz',
    lead: 'Platzhalterseite für Hinweise zur Verarbeitung personenbezogener Daten rund um Terminbuchungen.',
    blocks: [
      {
        heading: 'Verarbeitung',
        body: 'Personendaten werden in dieser MVP-Version verarbeitet, um Online-Terminbuchungen zu ermöglichen und den Salonbetrieb zu organisieren.',
      },
      {
        heading: 'Nächster Schritt',
        body: 'Vor dem Go-live muss hier ein vollständiger Datenschutzhinweis mit Rechtsgrundlagen, Empfängern und Speicherfristen eingefügt werden.',
      },
    ],
  },
  agb: {
    eyebrow: 'RECHTLICHES',
    title: 'AGB',
    lead: 'Platzhalterseite für die Allgemeinen Geschäftsbedingungen dieser SaaS- und Buchungslösung.',
    blocks: [
      {
        heading: 'Leistung',
        body: 'FadeFlow stellt eine Software für Online-Terminbuchung und Salonverwaltung bereit.',
      },
      {
        heading: 'Nächster Schritt',
        body: 'Vor dem Produktivbetrieb müssen hier verbindliche AGB mit Vertrags-, Haftungs- und Kündigungsregelungen ergänzt werden.',
      },
    ],
  },
  kontakt: {
    eyebrow: 'SUPPORT',
    title: 'Kontakt',
    lead: 'Platzhalterseite für allgemeine Support- und Kontaktinformationen.',
    blocks: [
      {
        heading: 'Support',
        body: 'E-Mail: support@fadeflow.ch',
      },
      {
        heading: 'Nächster Schritt',
        body: 'Vor dem Produktivbetrieb müssen hier die finalen Support-Kanäle, Zuständigkeiten und Reaktionszeiten ergänzt werden.',
      },
    ],
  },
};

@Component({
  selector: 'app-legal-placeholder-page',
  standalone: true,
  imports: [NgFor, AppFooterComponent],
  styles: [`
    .ff-legal-header { background: var(--ff-surface); border-bottom: 1px solid var(--ff-line); padding: 14px 24px; }
    .ff-legal-header-inner { max-width: 760px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .ff-legal-back-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 7px 14px;
      font-size: 13px; font-weight: 500; color: var(--ff-ink-muted);
      background: transparent; border: 1px solid var(--ff-line);
      border-radius: var(--ff-r-md); cursor: pointer;
      transition: color 120ms, border-color 120ms;
    }
    .ff-legal-back-btn:hover { color: var(--ff-ink); border-color: var(--ff-line-strong); }
    @media (max-width: 760px) {
      .ff-legal-header { padding: 12px 16px; }
    }
  `],
  template: `
    <div style="min-height:100vh;background:var(--ff-bg);display:flex;flex-direction:column;">

      <!-- Navbar -->
      <header class="ff-legal-header">
        <div class="ff-legal-header-inner">
          <img src="assets/images/Logo-textside.png" alt="FadeFlow" style="height:26px;width:auto;" />
          <button type="button" class="ff-legal-back-btn" (click)="goBack()">
            <i class="pi pi-arrow-left" style="font-size:12px;"></i>
            Zurück
          </button>
        </div>
      </header>

      <main style="flex:1;">
        <div style="max-width:760px;margin:0 auto;padding:40px 24px 56px;">
          <p class="ff-mono" style="font-size:10px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:var(--ff-ink-faint);margin:0 0 10px;">{{ content().eyebrow }}</p>
          <h1 class="ff-display" style="font-size:34px;color:var(--ff-ink);margin:0 0 10px;">{{ content().title }}</h1>
          <p style="font-size:14px;line-height:1.6;color:var(--ff-ink-muted);margin:0 0 28px;">{{ content().lead }}</p>

          <section style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);overflow:hidden;">
            <article *ngFor="let block of content().blocks; let isLast = last" style="padding:20px 24px;border-bottom:1px solid var(--ff-line);" [style.border-bottom]="isLast ? 'none' : '1px solid var(--ff-line)'">
              <h2 style="font-size:15px;font-weight:600;color:var(--ff-ink);margin:0 0 8px;">{{ block.heading }}</h2>
              <p style="font-size:13px;line-height:1.7;color:var(--ff-ink-muted);margin:0;">{{ block.body }}</p>
            </article>
          </section>
        </div>
      </main>

      <app-footer />
    </div>
  `,
})
export class LegalPlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  readonly content = computed(() => {
    const key = (this.route.snapshot.data['page'] as LegalPageKey | undefined) ?? 'impressum';
    return legalContent[key];
  });

  goBack(): void {
    this.location.back();
  }
}