import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { AdminSetupApiService } from '../core/admin-setup-api.service';
import type { AdminBookingItem, OpeningHourSlot, SalonProfile, ServiceItem, TimeOffBlock } from '../core/admin-setup.types';
import { AuthService } from '../core/auth.service';
import { frontendEnv } from '../core/frontend-env';

type SalonFormState = {
  name: string;
  email: string;
  phone: string;
  description: string;
  timezone: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  countryCode: string;
  bookingBufferMinutes: number;
};

type ServiceFormState = {
  name: string;
  description: string;
  durationMinutes: number;
  priceAmount: number;
  currency: string;
  sortOrder: number;
};

type OpeningDayState = {
  weekday: number;
  label: string;
  slots: Array<{
    startTime: string;
    endTime: string;
  }>;
};

type TimeOffFormState = {
  startsAt: string;
  endsAt: string;
  reason: string;
};

const weekdayLabels = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function createEmptySalonForm(): SalonFormState {
  return {
    name: '',
    email: '',
    phone: '',
    description: '',
    timezone: 'Europe/Zurich',
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    city: '',
    countryCode: 'CH',
    bookingBufferMinutes: 10,
  };
}

function createEmptyServiceForm(): ServiceFormState {
  return {
    name: '',
    description: '',
    durationMinutes: 60,
    priceAmount: 0,
    currency: 'CHF',
    sortOrder: 0,
  };
}

function createDefaultOpeningDays(): OpeningDayState[] {
  return weekdayLabels.map((label, index) => ({
    weekday: index,
    label,
    slots: [],
  }));
}

function createEmptyTimeOffForm(): TimeOffFormState {
  return {
    startsAt: '',
    endsAt: '',
    reason: '',
  };
}

function normalizeTimeValue(value: string): string {
  return value.slice(0, 5);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function toIsoDateTime(value: string): string {
  return new Date(value).toISOString();
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

@Component({
  selector: 'app-admin-shell-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, RouterLink],
  template: `
    <!-- FadeFlow admin shell -->
    <div style="min-height:100vh;background:var(--ff-bg);">

    <!-- Top nav -->
    <header class="ff-admin-topbar">
      <div class="ff-admin-topbar-inner">
        <div class="ff-admin-brand">
          <img src="assets/images/Logo-textside.png" alt="FadeFlow" style="height:28px;width:auto;" />
          <span class="ff-admin-brand-name">{{ salonName() }}</span>
          <nav class="ff-admin-nav">
            <a routerLink="/admin" class="ff-admin-nav-link" [class.active]="isActive('/admin')">Termine</a>
            <a routerLink="/admin/settings" class="ff-admin-nav-link" [class.active]="isActive('/admin/settings')">Einstellungen</a>
          </nav>
        </div>
        <div *ngIf="authService.adminProfile() as profile" style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:13px;color:var(--ff-ink-muted);">{{ profile.admin.firstName }} {{ profile.admin.lastName }}</span>
          <button type="button" (click)="reload()" title="Aktualisieren" class="ff-admin-icon-btn">
            <i class="pi pi-refresh" style="font-size:13px;"></i>
          </button>
          <button type="button" (click)="logout()" title="Abmelden" class="ff-admin-icon-btn">
            <i class="pi pi-sign-out" style="font-size:13px;"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- Status banners -->
    <div *ngIf="statusMessage()" style="background:var(--ff-ok-soft);border-bottom:1px solid var(--ff-ok);padding:10px 24px;font-size:13px;color:var(--ff-ok);display:flex;align-items:center;gap:8px;">
      <i class="pi pi-check-circle"></i> {{ statusMessage() }}
    </div>
    <div *ngIf="loadError()" style="background:var(--ff-bad-soft);border-bottom:1px solid var(--ff-bad);padding:10px 24px;font-size:13px;color:var(--ff-bad);display:flex;align-items:center;gap:8px;">
      <i class="pi pi-times-circle"></i> {{ loadError() }}
    </div>

    <!-- Loading -->
    <div *ngIf="loading()" style="display:flex;align-items:center;justify-content:center;padding:96px 0;color:var(--ff-ink-muted);gap:12px;">
      <i class="pi pi-spin pi-spinner" style="font-size:20px;"></i>
      Einstellungen werden geladen…
    </div>

    <!-- Layout: heading + sidebar/content row -->
    <div *ngIf="!loading()" style="max-width:1280px;margin:0 auto;padding:32px 24px;">
      <div style="margin-bottom:24px;">
        <p class="ff-mono" style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;color:var(--ff-ink-muted);margin:0 0 4px 0;">{{ activeSectionEyebrow() }}</p>
        <h2 class="ff-display" style="font-size:24px;color:var(--ff-ink);margin:0;">{{ activeSectionTitle() }}</h2>
      </div>

      <div style="display:flex;gap:32px;align-items:flex-start;">
        <!-- Sidebar -->
        <aside style="width:200px;flex-shrink:0;">
          <nav style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);overflow:hidden;">
            <button type="button" *ngFor="let item of sidebarSections" (click)="activeSection.set(item.id)"
              style="width:100%;text-align:left;padding:12px 16px;font-size:13px;font-weight:500;cursor:pointer;border:none;border-top:0;border-right:0;border-bottom:0;border-left:3px solid transparent;transition:all 0.12s;display:flex;align-items:center;gap:10px;background:transparent;"
              [style.background]="activeSection() === item.id ? 'var(--ff-accent-soft)' : 'transparent'"
              [style.color]="activeSection() === item.id ? 'var(--ff-accent-text)' : 'var(--ff-ink)'"
              [style.border-left-color]="activeSection() === item.id ? 'var(--ff-accent)' : 'transparent'">
              <i [class]="'pi ' + item.icon" style="font-size:13px;"></i>
              {{ item.label }}
            </button>
          </nav>

          <!-- Booking URL -->
          <div *ngIf="salon()" style="margin-top:16px;background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);padding:14px;">
            <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:var(--ff-ink-muted);margin:0 0 6px 0;">Buchungs-Link</p>
            <p class="ff-mono" style="font-size:10px;color:var(--ff-ink-muted);word-break:break-all;line-height:1.4;margin:0;">{{ bookingUrl() }}</p>
          </div>
        </aside>

        <!-- Main content -->
        <main style="flex:1;min-width:0;">

        <!-- SALON-PROFIL -->
        <section *ngIf="activeSection() === 'profil'">
          <div style="display:grid;grid-template-columns:1fr 280px;gap:24px;align-items:flex-start;">
            <!-- Profile form -->
            <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);overflow:hidden;">
              <div style="padding:16px 24px;border-bottom:1px solid var(--ff-line);display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <h3 style="font-size:15px;font-weight:600;color:var(--ff-ink);margin:0;">Profil</h3>
                  <p style="font-size:12px;color:var(--ff-ink-muted);margin:2px 0 0 0;">Für Kunden sichtbare Angaben</p>
                </div>
                <button type="submit" form="salon-form"
                  style="padding:8px 16px;background:var(--ff-ink);color:#fff;border:none;border-radius:var(--ff-r-md);font-size:13px;font-weight:500;cursor:pointer;">
                  <i class="pi pi-spin pi-spinner" *ngIf="savingProfile()" style="margin-right:6px;"></i>Speichern
                </button>
              </div>
              <form id="salon-form" (ngSubmit)="saveSalonProfile()" style="padding:24px;display:grid;gap:16px;grid-template-columns:1fr 1fr;">
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Salon-Name</label>
                  <input [(ngModel)]="salonForm.name" name="name" required class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">E-Mail</label>
                  <input [(ngModel)]="salonForm.email" name="email" type="email" class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Telefon</label>
                  <input [(ngModel)]="salonForm.phone" name="phone" class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Zeitzone</label>
                  <input [(ngModel)]="salonForm.timezone" name="timezone" required class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div style="grid-column:span 2;">
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Adresse Zeile 1</label>
                  <input [(ngModel)]="salonForm.addressLine1" name="addressLine1" class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div style="grid-column:span 2;">
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Adresse Zeile 2</label>
                  <input [(ngModel)]="salonForm.addressLine2" name="addressLine2" class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Postleitzahl</label>
                  <input [(ngModel)]="salonForm.postalCode" name="postalCode" class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Ort</label>
                  <input [(ngModel)]="salonForm.city" name="city" class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Ländercode</label>
                  <input [(ngModel)]="salonForm.countryCode" name="countryCode" maxlength="2" class="ff-input" style="width:100%;box-sizing:border-box;text-transform:uppercase;" />
                </div>
                <div style="grid-column:span 2;">
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Beschreibung</label>
                  <textarea [(ngModel)]="salonForm.description" name="description" rows="3" class="ff-input" style="width:100%;box-sizing:border-box;resize:vertical;"></textarea>
                </div>
              </form>
            </div>

            <!-- Logo upload -->
            <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);overflow:hidden;">
              <div style="padding:16px 20px;border-bottom:1px solid var(--ff-line);">
                <h3 style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">Logo</h3>
                <p style="font-size:12px;color:var(--ff-ink-muted);margin:2px 0 0 0;">JPG, PNG oder WEBP · max. 5 MB</p>
              </div>
              <div style="padding:20px;">
                <div style="min-height:120px;border:2px dashed var(--ff-line-strong);border-radius:var(--ff-r-md);display:flex;align-items:center;justify-content:center;background:var(--ff-bg-muted);">
                  <img *ngIf="logoUrl()" [src]="logoUrl()!" alt="Salon-Logo" style="max-height:100px;border-radius:6px;object-fit:contain;" />
                  <div *ngIf="!logoUrl()" style="text-align:center;color:var(--ff-ink-faint);">
                    <i class="pi pi-image" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                    <p style="font-size:12px;margin:0;">Noch kein Logo</p>
                  </div>
                </div>
                <label style="display:block;margin-top:14px;">
                  <span style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Bild wählen</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" (change)="uploadLogo($event)" style="font-size:12px;color:var(--ff-ink-muted);width:100%;" />
                </label>
                <p *ngIf="uploadingLogo()" style="margin-top:10px;font-size:12px;color:var(--ff-accent);display:flex;align-items:center;gap:6px;margin-bottom:0;">
                  <i class="pi pi-spin pi-spinner"></i> Wird hochgeladen…
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- LEISTUNGEN -->
        <section *ngIf="activeSection() === 'leistungen'">
          <!-- Service form -->
          <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);margin-bottom:16px;overflow:hidden;">
            <div style="padding:16px 24px;border-bottom:1px solid var(--ff-line);display:flex;align-items:center;justify-content:space-between;">
              <h3 style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">{{ editingServiceId() ? 'Leistung bearbeiten' : 'Neue Leistung' }}</h3>
              <button *ngIf="editingServiceId()" type="button" (click)="resetServiceForm()"
                style="font-size:12px;color:var(--ff-ink-muted);background:none;border:none;cursor:pointer;padding:4px 8px;">Abbrechen</button>
            </div>
            <form (ngSubmit)="saveService()" style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">
              <div style="grid-column:span 2;">
                <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Name</label>
                <input [(ngModel)]="serviceForm.name" name="serviceName" required class="ff-input" style="width:100%;box-sizing:border-box;" />
              </div>
              <div style="grid-column:span 2;">
                <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Beschreibung</label>
                <textarea [(ngModel)]="serviceForm.description" name="serviceDescription" rows="2" class="ff-input" style="width:100%;box-sizing:border-box;resize:vertical;"></textarea>
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Dauer (Min)</label>
                <input [(ngModel)]="serviceForm.durationMinutes" name="durationMinutes" type="number" min="5" step="5" required class="ff-input" style="width:100%;box-sizing:border-box;" />
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Preis (Rappen)</label>
                <input [(ngModel)]="serviceForm.priceAmount" name="priceAmount" type="number" min="0" step="100" required class="ff-input" style="width:100%;box-sizing:border-box;" />
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Währung</label>
                <input [(ngModel)]="serviceForm.currency" name="currency" maxlength="3" class="ff-input" style="width:100%;box-sizing:border-box;text-transform:uppercase;" />
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Reihenfolge</label>
                <input [(ngModel)]="serviceForm.sortOrder" name="sortOrder" type="number" min="0" step="1" class="ff-input" style="width:100%;box-sizing:border-box;" />
              </div>
              <div style="grid-column:span 2;">
                <button type="submit"
                  style="padding:10px 20px;background:var(--ff-accent);color:#fff;border:none;border-radius:var(--ff-r-md);font-size:13px;font-weight:500;cursor:pointer;">
                  <i class="pi pi-spin pi-spinner" *ngIf="savingService()" style="margin-right:6px;"></i>
                  {{ editingServiceId() ? 'Aktualisieren' : 'Erstellen' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Service list -->
          <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);overflow:hidden;">
            <div style="padding:16px 24px;border-bottom:1px solid var(--ff-line);">
              <h3 style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">Leistungen ({{ services().length }})</h3>
            </div>
            <article *ngFor="let service of services()"
              style="display:flex;align-items:center;gap:16px;padding:14px 24px;border-bottom:1px solid var(--ff-line);">
              <div style="flex:1;min-width:0;">
                <p style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">{{ service.name }}</p>
                <p style="font-size:12px;color:var(--ff-ink-muted);margin:2px 0 0 0;">{{ service.description || 'Keine Beschreibung' }}</p>
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <span class="ff-mono" style="font-size:11px;background:var(--ff-bg-muted);padding:3px 8px;border-radius:4px;color:var(--ff-ink-muted);">{{ service.durationMinutes }} min</span>
                <span class="ff-mono" style="font-size:11px;background:var(--ff-ok-soft);padding:3px 8px;border-radius:4px;color:var(--ff-ok);">{{ formatMoneyValue(service.priceAmount, service.currency) }}</span>
                <button type="button" (click)="startEditingService(service)"
                  style="padding:6px 10px;border:1px solid var(--ff-line);border-radius:var(--ff-r-sm);background:transparent;cursor:pointer;font-size:12px;color:var(--ff-ink-muted);">
                  <i class="pi pi-pencil"></i>
                </button>
                <button type="button" (click)="removeService(service.id)"
                  style="padding:6px 10px;border:1px solid var(--ff-bad);border-radius:var(--ff-r-sm);background:transparent;cursor:pointer;font-size:12px;color:var(--ff-bad);">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </article>
            <div *ngIf="services().length === 0" style="padding:48px 24px;text-align:center;color:var(--ff-ink-faint);">
              <i class="pi pi-box" style="font-size:24px;display:block;margin-bottom:10px;"></i>
              <p style="font-size:13px;margin:0;">Noch keine Leistungen. Erstelle dein erstes Angebot oben.</p>
            </div>
          </div>
        </section>

        <!-- ÖFFNUNGSZEITEN -->
        <section *ngIf="activeSection() === 'oeffnungszeiten'">
          <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);overflow:hidden;">
            <div style="padding:16px 24px;border-bottom:1px solid var(--ff-line);display:flex;align-items:center;justify-content:space-between;">
              <h3 style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">Wochenplan</h3>
              <button type="button" (click)="saveOpeningHours()"
                style="padding:8px 16px;background:var(--ff-ink);color:#fff;border:none;border-radius:var(--ff-r-md);font-size:13px;font-weight:500;cursor:pointer;">
                <i class="pi pi-spin pi-spinner" *ngIf="savingOpeningHours()" style="margin-right:6px;"></i>Speichern
              </button>
            </div>
            <article *ngFor="let day of openingDays; let dayIndex = index"
              style="padding:14px 24px;border-bottom:1px solid var(--ff-line);">
              <div style="display:flex;align-items:center;gap:16px;">
                <div style="width:120px;flex-shrink:0;">
                  <span style="font-size:13px;font-weight:600;color:var(--ff-ink);">{{ day.label }}</span>
                  <span *ngIf="day.slots.length === 0" style="display:block;font-size:11px;color:var(--ff-ink-faint);">Geschlossen</span>
                </div>
                <div style="flex:1;display:flex;flex-wrap:wrap;gap:6px;">
                  <span *ngFor="let slot of day.slots"
                    style="font-size:11px;background:var(--ff-accent-soft);color:var(--ff-accent-text);padding:3px 10px;border-radius:4px;">
                    {{ slot.startTime }} – {{ slot.endTime }}
                  </span>
                </div>
                <button *ngIf="day.slots.length < 3" type="button" (click)="addOpeningSlot(dayIndex)"
                  style="padding:6px 12px;border:1px solid var(--ff-line);border-radius:var(--ff-r-sm);background:transparent;cursor:pointer;font-size:12px;color:var(--ff-ink-muted);white-space:nowrap;flex-shrink:0;">
                  + Schicht
                </button>
              </div>
              <div *ngIf="day.slots.length > 0" style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
                <div *ngFor="let slot of day.slots; let slotIndex = index"
                  style="display:flex;align-items:center;gap:10px;">
                  <input [(ngModel)]="slot.startTime" [name]="'start-' + day.weekday + '-' + slotIndex" type="time"
                    class="ff-input" style="width:120px;" />
                  <span style="font-size:12px;color:var(--ff-ink-muted);">bis</span>
                  <input [(ngModel)]="slot.endTime" [name]="'end-' + day.weekday + '-' + slotIndex" type="time"
                    class="ff-input" style="width:120px;" />
                  <button type="button" (click)="removeOpeningSlot(dayIndex, slotIndex)"
                    style="padding:6px 10px;border:1px solid var(--ff-bad);border-radius:var(--ff-r-sm);background:transparent;cursor:pointer;font-size:12px;color:var(--ff-bad);">
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- ABWESENHEITEN -->
        <section *ngIf="activeSection() === 'abwesenheiten'">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:flex-start;">
            <!-- Form -->
            <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);overflow:hidden;">
              <div style="padding:16px 24px;border-bottom:1px solid var(--ff-line);">
                <h3 style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">Neue Sperrzeit</h3>
              </div>
              <form (ngSubmit)="saveTimeOffBlock()" style="padding:20px;display:flex;flex-direction:column;gap:14px;">
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Von</label>
                  <input [(ngModel)]="timeOffForm.startsAt" name="startsAt" type="datetime-local" required class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Bis</label>
                  <input [(ngModel)]="timeOffForm.endsAt" name="endsAt" type="datetime-local" required class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Grund</label>
                  <input [(ngModel)]="timeOffForm.reason" name="timeOffReason" placeholder="z.B. Feiertag" class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <button type="submit"
                  style="padding:10px 20px;background:var(--ff-accent);color:#fff;border:none;border-radius:var(--ff-r-md);font-size:13px;font-weight:500;cursor:pointer;align-self:flex-start;">
                  <i class="pi pi-spin pi-spinner" *ngIf="savingTimeOff()" style="margin-right:6px;"></i>Hinzufügen
                </button>
              </form>
            </div>

            <!-- List -->
            <div style="display:flex;flex-direction:column;gap:10px;">
              <article *ngFor="let block of timeOffBlocks()"
                style="display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--ff-warn-soft);border:1px solid var(--ff-warn);border-radius:var(--ff-r-md);padding:14px 16px;">
                <div>
                  <p style="font-size:13px;font-weight:600;color:var(--ff-ink);margin:0;">{{ block.reason || 'Gesperrte Zeit' }}</p>
                  <p class="ff-mono" style="font-size:11px;color:var(--ff-ink-muted);margin:4px 0 0 0;">{{ formatDateTimeValue(block.startsAt) }} → {{ formatDateTimeValue(block.endsAt) }}</p>
                </div>
                <button type="button" (click)="removeTimeOffBlock(block.id)"
                  style="padding:6px 10px;border:1px solid var(--ff-bad);border-radius:var(--ff-r-sm);background:transparent;cursor:pointer;font-size:12px;color:var(--ff-bad);flex-shrink:0;">
                  <i class="pi pi-trash"></i>
                </button>
              </article>
              <div *ngIf="timeOffBlocks().length === 0"
                style="border:2px dashed var(--ff-line);border-radius:var(--ff-r-md);padding:48px 24px;text-align:center;color:var(--ff-ink-faint);">
                <i class="pi pi-calendar-times" style="font-size:24px;display:block;margin-bottom:10px;"></i>
                <p style="font-size:13px;margin:0;">Noch keine Sperrzeiten.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- BUCHUNGSREGELN -->
        <section *ngIf="activeSection() === 'buchungsregeln'">
          <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);overflow:hidden;max-width:480px;">
            <div style="padding:16px 24px;border-bottom:1px solid var(--ff-line);display:flex;align-items:center;justify-content:space-between;">
              <h3 style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">Puffer-Zeit</h3>
              <button type="button" (click)="saveSalonProfile()"
                style="padding:8px 16px;background:var(--ff-ink);color:#fff;border:none;border-radius:var(--ff-r-md);font-size:13px;font-weight:500;cursor:pointer;">
                <i class="pi pi-spin pi-spinner" *ngIf="savingProfile()" style="margin-right:6px;"></i>Speichern
              </button>
            </div>
            <div style="padding:24px;">
              <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Buchungs-Puffer (Minuten)</label>
              <input [(ngModel)]="salonForm.bookingBufferMinutes" name="bookingBufferMinutes" type="number" min="0" max="120" step="5" class="ff-input" style="width:100%;box-sizing:border-box;" />
              <p style="font-size:12px;color:var(--ff-ink-muted);margin:8px 0 0 0;">Mindestabstand zwischen Terminen.</p>
            </div>
          </div>
        </section>

        </main>
      </div>
    </div>
    </div>
  `,
})
export class AdminShellPage {
  readonly authService = inject(AuthService);
  private readonly adminSetupApi = inject(AdminSetupApiService);
  private readonly router = inject(Router);

  readonly activeSection = signal('profil');
  readonly sidebarSections = [
    { id: 'profil', label: 'Salon-Profil', icon: 'pi-building' },
    { id: 'leistungen', label: 'Leistungen', icon: 'pi-tag' },
    { id: 'oeffnungszeiten', label: 'Öffnungszeiten', icon: 'pi-clock' },
    { id: 'abwesenheiten', label: 'Abwesenheiten', icon: 'pi-calendar-times' },
    { id: 'buchungsregeln', label: 'Buchungsregeln', icon: 'pi-sliders-h' },
  ];

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);
  readonly savingProfile = signal(false);
  readonly uploadingLogo = signal(false);
  readonly savingService = signal(false);
  readonly editingServiceId = signal<string | null>(null);
  readonly savingOpeningHours = signal(false);
  readonly savingTimeOff = signal(false);

  readonly salon = signal<SalonProfile | null>(null);
  readonly services = signal<ServiceItem[]>([]);
  readonly timeOffBlocks = signal<TimeOffBlock[]>([]);
  readonly upcomingBookings = signal<AdminBookingItem[]>([]);

  salonForm: SalonFormState = createEmptySalonForm();
  serviceForm: ServiceFormState = createEmptyServiceForm();
  openingDays: OpeningDayState[] = createDefaultOpeningDays();
  timeOffForm: TimeOffFormState = createEmptyTimeOffForm();

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      await this.authService.ensureInitialized();

      if (!this.authService.adminProfile() && this.authService.currentUser()) {
        await this.authService.fetchAdminProfile();
      }

      const [salon, services, openingHours, timeOffBlocks, upcomingBookings] = await Promise.all([
        this.adminSetupApi.getSalon(),
        this.adminSetupApi.listServices(),
        this.adminSetupApi.getOpeningHours(),
        this.adminSetupApi.listTimeOffBlocks(),
        this.adminSetupApi.listUpcomingBookings(),
      ]);

      this.salon.set(salon);
      this.services.set(services);
      this.timeOffBlocks.set(timeOffBlocks);
      this.upcomingBookings.set(upcomingBookings);
      this.applySalonForm(salon);
      this.applyOpeningHours(openingHours);
      this.statusMessage.set(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Die Salon-Einstellungen konnten nicht geladen werden.';
      this.loadError.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  activeSectionEyebrow(): string {
    switch (this.activeSection()) {
      case 'profil':
        return 'SALON-PROFIL';
      case 'leistungen':
        return 'LEISTUNGEN';
      case 'oeffnungszeiten':
        return 'ÖFFNUNGSZEITEN';
      case 'abwesenheiten':
        return 'ABWESENHEITEN';
      case 'buchungsregeln':
        return 'BUCHUNGSREGELN';
    }

    return '';
  }

  activeSectionTitle(): string {
    switch (this.activeSection()) {
      case 'profil':
        return 'Salon-Einstellungen';
      case 'leistungen':
        return 'Angebote verwalten';
      case 'oeffnungszeiten':
        return 'Wöchentliche Zeiten';
      case 'abwesenheiten':
        return 'Sperrzeiten';
      case 'buchungsregeln':
        return 'Buchungseinstellungen';
    }

    return '';
  }

  salonName(): string {
    return this.salon()?.name ?? this.authService.adminProfile()?.salon.name ?? '';
  }

  logoUrl(): string | null {
    const logoUrl = this.salon()?.logoUrl;

    if (!logoUrl) {
      return null;
    }

    return logoUrl.startsWith('http') ? logoUrl : `${frontendEnv.assetBaseUrl}${logoUrl}`;
  }

  async saveSalonProfile(): Promise<void> {
    this.savingProfile.set(true);
    this.loadError.set(null);

    try {
      const salon = await this.adminSetupApi.updateSalon({
        name: this.salonForm.name.trim(),
        email: this.optionalValue(this.salonForm.email),
        phone: this.optionalValue(this.salonForm.phone),
        description: this.optionalValue(this.salonForm.description),
        timezone: this.salonForm.timezone.trim(),
        addressLine1: this.optionalValue(this.salonForm.addressLine1),
        addressLine2: this.optionalValue(this.salonForm.addressLine2),
        postalCode: this.optionalValue(this.salonForm.postalCode),
        city: this.optionalValue(this.salonForm.city),
        countryCode: this.salonForm.countryCode.trim().toUpperCase(),
        bookingBufferMinutes: Number(this.salonForm.bookingBufferMinutes),
      });

      this.salon.set(salon);
      this.applySalonForm(salon);
      this.statusMessage.set('Salon-Profil gespeichert.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Das Salon-Profil konnte nicht gespeichert werden.');
    } finally {
      this.savingProfile.set(false);
    }
  }

  async uploadLogo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadingLogo.set(true);
    this.loadError.set(null);

    try {
      const salon = await this.adminSetupApi.uploadSalonLogo(file);
      this.salon.set(salon);
      this.applySalonForm(salon);
      this.statusMessage.set('Salon-Logo hochgeladen.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Das Salon-Logo konnte nicht hochgeladen werden.');
    } finally {
      input.value = '';
      this.uploadingLogo.set(false);
    }
  }

  resetServiceForm(): void {
    this.serviceForm = createEmptyServiceForm();
    this.editingServiceId.set(null);
  }

  startEditingService(service: ServiceItem): void {
    this.editingServiceId.set(service.id);
    this.serviceForm = {
      name: service.name,
      description: service.description ?? '',
      durationMinutes: service.durationMinutes,
      priceAmount: service.priceAmount,
      currency: service.currency,
      sortOrder: service.sortOrder,
    };
  }

  async saveService(): Promise<void> {
    this.savingService.set(true);
    this.loadError.set(null);

    try {
      const payload = {
        name: this.serviceForm.name.trim(),
        description: this.optionalValue(this.serviceForm.description),
        durationMinutes: Number(this.serviceForm.durationMinutes),
        priceAmount: Number(this.serviceForm.priceAmount),
        currency: this.serviceForm.currency.trim().toUpperCase() || 'CHF',
        sortOrder: Number(this.serviceForm.sortOrder),
      };

      const currentServiceId = this.editingServiceId();

      if (currentServiceId) {
        const updatedService = await this.adminSetupApi.updateService(currentServiceId, payload);
        this.services.set(this.services().map((service) => (service.id === updatedService.id ? updatedService : service)));
        this.statusMessage.set('Leistung aktualisiert.');
      } else {
        const createdService = await this.adminSetupApi.createService(payload);
        this.services.set([...this.services(), createdService].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)));
        this.statusMessage.set('Leistung erstellt.');
      }

      this.resetServiceForm();
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Die Leistung konnte nicht gespeichert werden.');
    } finally {
      this.savingService.set(false);
    }
  }

  async removeService(serviceId: string): Promise<void> {
    const shouldArchive = window.confirm('Diese Leistung archivieren? Bestehende Termine behalten ihre Referenz.');

    if (!shouldArchive) {
      return;
    }

    this.loadError.set(null);

    try {
      await this.adminSetupApi.deleteService(serviceId);
      this.services.set(this.services().filter((service) => service.id !== serviceId));

      if (this.editingServiceId() === serviceId) {
        this.resetServiceForm();
      }

      this.statusMessage.set('Leistung archiviert.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Die Leistung konnte nicht archiviert werden.');
    }
  }

  addOpeningSlot(dayIndex: number): void {
    const day = this.openingDays[dayIndex];

    if (!day || day.slots.length >= 3) {
      return;
    }

    day.slots = [...day.slots, { startTime: '09:00', endTime: '17:00' }];
    this.openingDays = [...this.openingDays];
  }

  removeOpeningSlot(dayIndex: number, slotIndex: number): void {
    const day = this.openingDays[dayIndex];

    if (!day) {
      return;
    }

    day.slots = day.slots.filter((_, index) => index !== slotIndex);
    this.openingDays = [...this.openingDays];
  }

  async saveOpeningHours(): Promise<void> {
    this.savingOpeningHours.set(true);
    this.loadError.set(null);

    try {
      const days = this.openingDays.map((day) => ({
        weekday: day.weekday,
        slots: day.slots
          .map((slot) => ({
            startTime: slot.startTime.trim(),
            endTime: slot.endTime.trim(),
          }))
          .filter((slot) => slot.startTime.length > 0 || slot.endTime.length > 0),
      }));

      for (const day of days) {
        for (const slot of day.slots) {
          if (!slot.startTime || !slot.endTime) {
            throw new Error('Jede Schicht braucht eine Start- und Endzeit.');
          }
        }
      }

      const openingHours = await this.adminSetupApi.replaceOpeningHours({ days });
      this.applyOpeningHours(openingHours);
      this.statusMessage.set('Öffnungszeiten gespeichert.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Die Öffnungszeiten konnten nicht gespeichert werden.');
    } finally {
      this.savingOpeningHours.set(false);
    }
  }

  async saveTimeOffBlock(): Promise<void> {
    this.savingTimeOff.set(true);
    this.loadError.set(null);

    try {
      if (!this.timeOffForm.startsAt || !this.timeOffForm.endsAt) {
        throw new Error('Für eine Sperrzeit sind Start und Ende erforderlich.');
      }

      const timeOffBlock = await this.adminSetupApi.createTimeOffBlock({
        startsAt: toIsoDateTime(this.timeOffForm.startsAt),
        endsAt: toIsoDateTime(this.timeOffForm.endsAt),
        reason: this.optionalValue(this.timeOffForm.reason),
      });

      this.timeOffBlocks.set(
        [...this.timeOffBlocks(), timeOffBlock].sort(
          (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
        ),
      );
      this.timeOffForm = createEmptyTimeOffForm();
      this.statusMessage.set('Sperrzeit hinzugefügt.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Die Sperrzeit konnte nicht hinzugefügt werden.');
    } finally {
      this.savingTimeOff.set(false);
    }
  }

  async removeTimeOffBlock(blockId: string): Promise<void> {
    const shouldDelete = window.confirm('Diese Sperrzeit entfernen?');

    if (!shouldDelete) {
      return;
    }

    this.loadError.set(null);

    try {
      await this.adminSetupApi.deleteTimeOffBlock(blockId);
      this.timeOffBlocks.set(this.timeOffBlocks().filter((block) => block.id !== blockId));
      this.statusMessage.set('Sperrzeit entfernt.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Die Sperrzeit konnte nicht entfernt werden.');
    }
  }

  bookingUrl(): string {
    const slug = this.salon()?.slug;

    if (!slug) {
      return '';
    }

    return `${window.location.origin}/s/${slug}/book`;
  }

  formatMoneyValue(amount: number, currency: string): string {
    return formatMoney(amount, currency);
  }

  formatDateTimeValue(value: string): string {
    return formatDateTime(value);
  }

  private applySalonForm(salon: SalonProfile): void {
    this.salonForm = {
      name: salon.name,
      email: salon.email ?? '',
      phone: salon.phone ?? '',
      description: salon.description ?? '',
      timezone: salon.timezone,
      addressLine1: salon.addressLine1 ?? '',
      addressLine2: salon.addressLine2 ?? '',
      postalCode: salon.postalCode ?? '',
      city: salon.city ?? '',
      countryCode: salon.countryCode,
      bookingBufferMinutes: salon.bookingBufferMinutes,
    };
  }

  private applyOpeningHours(openingHours: OpeningHourSlot[]): void {
    const days = createDefaultOpeningDays();

    for (const slot of openingHours) {
      const day = days.find((candidate) => candidate.weekday === slot.weekday);

      if (!day) {
        continue;
      }

      day.slots.push({
        startTime: normalizeTimeValue(slot.startTime),
        endTime: normalizeTimeValue(slot.endTime),
      });
    }

    this.openingDays = days;
  }

  private optionalValue(value: string): string | undefined {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : undefined;
  }
}
