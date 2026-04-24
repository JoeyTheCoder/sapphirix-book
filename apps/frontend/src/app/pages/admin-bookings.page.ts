import { NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AdminSetupApiService } from '../core/admin-setup-api.service';
import type {
  AdminBookingCalendar,
  AdminBookingItem,
  AdminBookingPayload,
  AdminBookingStatus,
  OpeningHourSlot,
  SalonProfile,
  ServiceItem,
} from '../core/admin-setup.types';
import { AuthService } from '../core/auth.service';

type ManualBookingFormState = {
  serviceId: string;
  startsAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  customerNotes: string;
};

type TimelineRow = {
  time: string;
  label: string;
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return toIsoDate(value);
}

function getTodayIsoDate(): string {
  return toIsoDate(new Date());
}

function getWeekdayIndex(date: string): number {
  const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

function getWeekDates(anchorDate: string): string[] {
  const weekdayIndex = getWeekdayIndex(anchorDate);
  const monday = addDays(anchorDate, -weekdayIndex);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${value}T12:00:00`));
}

function formatLongDateLabel(value: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (value % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function toDateTimeLocalInput(isoValue: string): string {
  const date = new Date(isoValue);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function createEmptyManualBookingForm(selectedDate: string): ManualBookingFormState {
  return {
    serviceId: '',
    startsAt: `${selectedDate}T09:00`,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    customerNotes: '',
  };
}

@Component({
  selector: 'app-admin-bookings-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, RouterLink],
  styles: [`
    .ff-week-day { border: 1px solid var(--ff-line); border-radius: var(--ff-r-lg); padding: 10px 8px; cursor: pointer; background: var(--ff-surface); transition: border-color 120ms, background 120ms; text-align: left; }
    .ff-week-day:hover { border-color: var(--ff-accent); }
    .ff-week-day.selected { border-color: var(--ff-accent); border-top: 3px solid var(--ff-accent); background: var(--ff-surface-alt); }
    .ff-booking-block { border-radius: var(--ff-r-md); border: 1px solid var(--ff-line); padding: 8px 12px; cursor: pointer; transition: box-shadow 120ms; border-left-width: 3px; }
    .ff-booking-block:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .ff-booking-block.status-pending { background: var(--ff-warn-soft); border-left-color: var(--ff-warn); }
    .ff-booking-block.status-confirmed { background: var(--ff-ok-soft); border-left-color: var(--ff-ok); }
    .ff-booking-block.status-cancelled { background: var(--ff-bad-soft); border-left-color: var(--ff-bad); }
    .ff-booking-block.status-completed { background: var(--ff-bg-muted, #f8f9fa); border-left-color: var(--ff-ink-faint); }
    .ff-status-chip { display: inline-block; font-family: "JetBrains Mono", monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; font-weight: 500; }
    .chip-pending { background: var(--ff-warn-soft); color: var(--ff-warn); }
    .chip-confirmed { background: var(--ff-ok-soft); color: var(--ff-ok); }
    .chip-cancelled { background: var(--ff-bad-soft); color: var(--ff-bad); }
    .chip-completed { background: #f1f5f9; color: var(--ff-ink-muted); }
    .ff-input {
      display: block; width: 100%; height: 40px; padding: 0 12px;
      border: 1px solid var(--ff-line); border-radius: var(--ff-r-md);
      background: var(--ff-surface); font-size: 13.5px; color: var(--ff-ink); outline: none;
      transition: border-color 150ms, box-shadow 150ms;
    }
    .ff-input:focus { border-color: var(--ff-accent); box-shadow: 0 0 0 3px var(--ff-accent-soft); }
    .ff-textarea { height: auto; padding: 10px 12px; resize: none; }
    .ff-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%238d8a94' d='M1 1l5 5 5-5'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
    .ff-btn { height: 36px; padding: 0 16px; border-radius: var(--ff-r-md); font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid var(--ff-line); background: var(--ff-surface); color: var(--ff-ink-muted); transition: all 120ms; }
    .ff-btn:hover { border-color: var(--ff-line-strong); color: var(--ff-ink); }
    .ff-btn-primary { background: var(--ff-accent); color: #fff; border-color: var(--ff-accent); }
    .ff-btn-primary:hover { background: #13adb2; border-color: #13adb2; }
    .ff-btn-danger { background: var(--ff-bad-soft); color: var(--ff-bad); border-color: var(--ff-bad); }
    .ff-btn-ok { background: var(--ff-ok-soft); color: var(--ff-ok); border-color: var(--ff-ok); }
    .ff-btn-ink { background: var(--ff-ink); color: var(--ff-bg); border-color: var(--ff-ink); }
    .ff-btn-ink:hover { opacity: 0.88; }
  `],
  template: `
    <!-- Top navigation bar -->
    <header class="ff-admin-topbar">
      <div class="ff-admin-topbar-inner">
        <!-- Logo + nav -->
        <div class="ff-admin-brand">
          <img src="assets/images/Logo-textside.png" alt="FadeFlow" style="height:28px; width:auto;" />
          <span class="ff-admin-brand-name">{{ salonName() }}</span>
          <nav class="ff-admin-nav">
            <a routerLink="/admin" class="ff-admin-nav-link" [class.active]="isActive('/admin')">Termine</a>
            <a routerLink="/admin/settings" class="ff-admin-nav-link" [class.active]="isActive('/admin/settings')">Einstellungen</a>
          </nav>
        </div>

        <!-- Right actions -->
        <div style="display:flex; align-items:center; gap:8px;" *ngIf="authService.adminProfile() as profile">
          <span style="font-size:13px; color:var(--ff-ink-muted);">{{ profile.admin.firstName }} {{ profile.admin.lastName }}</span>
          <button type="button" (click)="reload()" title="Aktualisieren" class="ff-admin-icon-btn">
            <i class="pi pi-refresh" style="font-size:13px;"></i>
          </button>
          <button type="button" (click)="logout()" title="Abmelden" class="ff-admin-icon-btn">
            <i class="pi pi-sign-out" style="font-size:13px;"></i>
          </button>
        </div>
      </div>
    </header>

    <main style="min-height:calc(100vh - 56px); background:var(--ff-bg);">
      <div style="max-width:1200px; margin:0 auto; padding:32px 24px;">

        <!-- Status / error banners -->
        <div *ngIf="statusMessage()" style="margin-bottom:16px; padding:12px 16px; border:1px solid var(--ff-ok); border-left:3px solid var(--ff-ok); border-radius:var(--ff-r-md); background:var(--ff-ok-soft); font-size:13px; color:var(--ff-ok);">
          {{ statusMessage() }}
        </div>
        <div *ngIf="loadError()" style="margin-bottom:16px; padding:12px 16px; border:1px solid var(--ff-bad); border-left:3px solid var(--ff-bad); border-radius:var(--ff-r-md); background:var(--ff-bad-soft); font-size:13px; color:var(--ff-bad);">
          {{ loadError() }}
        </div>

        <!-- Loading state -->
        <div *ngIf="loading()" style="display:flex; align-items:center; justify-content:center; padding:64px 0; color:var(--ff-ink-faint);">
          <i class="pi pi-spin pi-spinner" style="font-size:20px; margin-right:12px;"></i>
          <span style="font-size:14px;">Termine werden geladen…</span>
        </div>

        <div *ngIf="!loading()">
          <!-- Date header -->
          <div style="margin-bottom:24px;">
            <p class="ff-mono" style="font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:var(--ff-ink-faint); margin:0 0 8px;">Tagesplan</p>
            <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap;">
              <div>
                <h1 class="ff-display" style="font-size:36px; font-weight:400; letter-spacing:-0.01em; color:var(--ff-ink); margin:0 0 4px;">{{ formatLongDate(selectedDate()) }}</h1>
                <p class="ff-mono" style="font-size:12px; color:var(--ff-ink-faint);">
                  KW {{ getKW(selectedDate()) }} &nbsp;·&nbsp; {{ bookings().length }} Termine
                </p>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" (click)="moveSelectedDate(-1)" class="ff-btn">‹ Zurück</button>
                <button type="button" (click)="jumpToToday()" class="ff-btn">Heute</button>
                <button type="button" (click)="moveSelectedDate(1)" class="ff-btn">Vor ›</button>
                <button type="button" (click)="openCreateDrawer()" class="ff-btn ff-btn-ink" style="height:36px; padding:0 16px; display:flex; align-items:center; gap:6px;">
                  <i class="pi pi-plus" style="font-size:11px;"></i> Neuer Termin
                </button>
              </div>
            </div>
          </div>

          <!-- Week scrubber -->
          <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:8px; margin-bottom:28px;">
            <button
              *ngFor="let day of weekDates()"
              type="button"
              (click)="setSelectedDate(day)"
              class="ff-week-day"
              [class.selected]="day === selectedDate()"
            >
              <p class="ff-mono" style="font-size:10px; letter-spacing:0.14em; text-transform:uppercase; margin:0 0 6px;"
                [style.color]="day === selectedDate() ? 'var(--ff-accent)' : 'var(--ff-ink-faint)'">{{ getShortWeekday(day) }}</p>
              <p style="font-size:20px; font-weight:600; color:var(--ff-ink); margin:0 0 4px;">{{ day.slice(8,10) }}</p>
              <p class="ff-mono" style="font-size:11px; color:var(--ff-ink-muted); margin:0;">{{ countBookingsForDate(day) }} Termine</p>
            </button>
          </div>

          <!-- Timeline -->
          <div style="background:var(--ff-surface); border:1px solid var(--ff-line); border-radius:var(--ff-r-lg); overflow:hidden;">

            <!-- Empty state -->
            <div *ngIf="timelineRows().length === 0" style="padding:48px 24px; text-align:center; color:var(--ff-ink-faint);">
              <p class="ff-mono" style="font-size:12px;">Keine Öffnungszeiten für diesen Tag konfiguriert.</p>
            </div>

            <!-- Timeline rows -->
            <div *ngFor="let row of timelineRows(); let i = index"
              style="display:grid; grid-template-columns:72px 1fr; border-top:1px solid var(--ff-line);"
              [style.border-top]="i === 0 ? 'none' : '1px solid var(--ff-line)'">
              <!-- Hour label -->
              <div class="ff-mono" style="font-size:11px; color:var(--ff-ink-faint); padding:14px 12px 14px 16px; display:flex; align-items:flex-start; padding-top:16px;">{{ row.label }}</div>
              <!-- Slot content -->
              <div style="padding:8px 12px 8px 0; border-left:1px solid var(--ff-line); min-height:60px;">
                <div *ngIf="bookingAt(row.time) as booking; else emptySlot">
                  <button
                    type="button"
                    (click)="openDetailDrawer(booking.id)"
                    class="ff-booking-block"
                    [class]="'ff-booking-block status-' + booking.status"
                    style="width:100%; text-align:left; cursor:pointer;"
                  >
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                      <span class="ff-mono" style="font-size:11px; color:var(--ff-ink-faint);">{{ formatTimeValue(booking.startsAt) }}–{{ formatTimeValue(booking.endsAt) }}</span>
                      <span class="ff-status-chip" [class]="'chip-' + booking.status">{{ getStatusLabel(booking.status) }}</span>
                    </div>
                    <p style="font-size:13px; font-weight:600; color:var(--ff-ink); margin:0 0 2px;">{{ booking.customer.firstName }} {{ booking.customer.lastName }}</p>
                    <p style="font-size:12px; color:var(--ff-ink-muted); margin:0;">{{ booking.service.name }}</p>
                  </button>
                </div>
                <ng-template #emptySlot>
                  <button
                    type="button"
                    (click)="openCreateDrawer(row.time)"
                    style="width:100%; min-height:44px; background:transparent; border:none; cursor:pointer; text-align:left; padding:4px 0 4px 14px; color:var(--ff-ink-faint); font-size:12px; display:flex; align-items:center; gap:6px; transition:color 120ms;"
                    onmouseenter="this.style.color='var(--ff-accent)'"
                    onmouseleave="this.style.color='var(--ff-ink-faint)'"
                  >
                    <i class="pi pi-plus-circle" style="font-size:12px;"></i>
                    <span class="ff-mono" style="font-size:11px; letter-spacing:0.1em;">Verfügbar</span>
                  </button>
                </ng-template>
              </div>
            </div>
          </div>

        </div><!-- /!loading -->
      </div>
    </main>

    <!-- Backdrop -->
    <div *ngIf="createDrawerOpen() || detailDrawerOpen()"
      style="position:fixed; inset:0; z-index:40; background:rgba(15,30,58,0.3);"
      (click)="closeDrawers()"></div>

    <!-- Create booking drawer -->
    <aside *ngIf="createDrawerOpen()"
      style="position:fixed; right:0; top:0; z-index:50; height:100%; width:100%; max-width:480px; background:var(--ff-surface); border-left:1px solid var(--ff-line); box-shadow:-8px 0 32px rgba(15,30,58,0.10); overflow-y:auto; display:flex; flex-direction:column;">
      <!-- Drawer header -->
      <div style="padding:20px 24px; border-bottom:1px solid var(--ff-line); display:flex; align-items:center; justify-content:space-between;">
        <div>
          <p class="ff-mono" style="font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ff-ink-faint); margin:0 0 4px;">Manuell</p>
          <h3 style="font-size:18px; font-weight:600; color:var(--ff-ink); margin:0;">Termin erstellen</h3>
        </div>
        <button type="button" (click)="closeDrawers()" class="ff-btn" style="width:36px; padding:0; display:flex; align-items:center; justify-content:center;">
          <i class="pi pi-times" style="font-size:13px;"></i>
        </button>
      </div>

      <form style="flex:1; padding:24px; display:flex; flex-direction:column; gap:16px;" (ngSubmit)="saveManualBooking()">
        <div>
          <label class="ff-mono" style="display:block; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ff-ink-faint); margin-bottom:6px;">Leistung</label>
          <select [(ngModel)]="manualBookingForm.serviceId" name="serviceId" required class="ff-input ff-select">
            <option value="" disabled>Leistung wählen</option>
            <option *ngFor="let s of services()" [value]="s.id">{{ s.name }} · {{ s.durationMinutes }} min</option>
          </select>
        </div>
        <div>
          <label class="ff-mono" style="display:block; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ff-ink-faint); margin-bottom:6px;">Startzeit</label>
          <input [(ngModel)]="manualBookingForm.startsAt" name="startsAt" type="datetime-local" required class="ff-input" />
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label class="ff-mono" style="display:block; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ff-ink-faint); margin-bottom:6px;">Vorname</label>
            <input [(ngModel)]="manualBookingForm.firstName" name="firstName" required class="ff-input" />
          </div>
          <div>
            <label class="ff-mono" style="display:block; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ff-ink-faint); margin-bottom:6px;">Nachname</label>
            <input [(ngModel)]="manualBookingForm.lastName" name="lastName" required class="ff-input" />
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label class="ff-mono" style="display:block; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ff-ink-faint); margin-bottom:6px;">E-Mail</label>
            <input [(ngModel)]="manualBookingForm.email" name="email" type="email" class="ff-input" />
          </div>
          <div>
            <label class="ff-mono" style="display:block; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ff-ink-faint); margin-bottom:6px;">Telefon</label>
            <input [(ngModel)]="manualBookingForm.phone" name="phone" class="ff-input" />
          </div>
        </div>
        <div>
          <label class="ff-mono" style="display:block; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ff-ink-faint); margin-bottom:6px;">Notizen</label>
          <textarea [(ngModel)]="manualBookingForm.customerNotes" name="customerNotes" rows="3" class="ff-input ff-textarea"></textarea>
        </div>
        <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px; padding-top:8px; border-top:1px solid var(--ff-line); margin-top:auto;">
          <button type="button" (click)="closeDrawers()" class="ff-btn">Abbrechen</button>
          <button type="submit" class="ff-btn ff-btn-ink" [disabled]="savingManualBooking()" style="display:flex; align-items:center; gap:6px;">
            <i *ngIf="savingManualBooking()" class="pi pi-spin pi-spinner" style="font-size:12px;"></i>
            Termin erstellen
          </button>
        </div>
      </form>
    </aside>

    <!-- Detail drawer -->
    <aside *ngIf="detailDrawerOpen() && selectedBooking() as booking"
      style="position:fixed; right:0; top:0; z-index:50; height:100%; width:100%; max-width:480px; background:var(--ff-surface); border-left:1px solid var(--ff-line); box-shadow:-8px 0 32px rgba(15,30,58,0.10); overflow-y:auto; display:flex; flex-direction:column;">
      <!-- Header -->
      <div style="padding:20px 24px; border-bottom:1px solid var(--ff-line); display:flex; align-items:center; justify-content:space-between;">
        <div>
          <p class="ff-mono" style="font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ff-ink-faint); margin:0 0 4px;">Termindetail</p>
          <h3 class="ff-display" style="font-size:20px; font-weight:400; color:var(--ff-ink); margin:0;">{{ booking.customer.firstName }} {{ booking.customer.lastName }}</h3>
        </div>
        <button type="button" (click)="closeDrawers()" class="ff-btn" style="width:36px; padding:0; display:flex; align-items:center; justify-content:center;">
          <i class="pi pi-times" style="font-size:13px;"></i>
        </button>
      </div>

      <div style="padding:24px; flex:1; display:flex; flex-direction:column; gap:16px;">
        <!-- Status card -->
        <div style="background:var(--ff-ink); color:var(--ff-bg); border-radius:var(--ff-r-lg); padding:20px 24px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px;">
            <div>
              <p class="ff-mono" style="font-size:10px; letter-spacing:0.12em; text-transform:uppercase; opacity:0.6; margin:0 0 4px;">Status</p>
              <p class="ff-status-chip" [class]="'chip-' + booking.status" style="display:inline-block;">{{ getStatusLabel(booking.status) }}</p>
            </div>
          </div>
          <p style="font-size:15px; font-weight:600; margin:0 0 4px;">{{ booking.service.name }}</p>
          <p class="ff-mono" style="font-size:12px; opacity:0.7; margin:0;">{{ formatTimeValue(booking.startsAt) }} – {{ formatTimeValue(booking.endsAt) }} · {{ booking.service.durationMinutes }} min</p>
        </div>

        <!-- Customer info -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div style="background:var(--ff-bg); border:1px solid var(--ff-line); border-radius:var(--ff-r-md); padding:14px;">
            <p class="ff-mono" style="font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ff-ink-faint); margin:0 0 6px;">E-Mail</p>
            <p style="font-size:13px; color:var(--ff-ink); margin:0;">{{ booking.customer.email || '—' }}</p>
          </div>
          <div style="background:var(--ff-bg); border:1px solid var(--ff-line); border-radius:var(--ff-r-md); padding:14px;">
            <p class="ff-mono" style="font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ff-ink-faint); margin:0 0 6px;">Telefon</p>
            <p style="font-size:13px; color:var(--ff-ink); margin:0;">{{ booking.customer.phone || '—' }}</p>
          </div>
        </div>

        <!-- Notes -->
        <div style="border:1px solid var(--ff-line); border-radius:var(--ff-r-md); padding:14px;">
          <p class="ff-mono" style="font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ff-ink-faint); margin:0 0 6px;">Kundennotizen</p>
          <p style="font-size:13px; color:var(--ff-ink-muted); white-space:pre-wrap; margin:0;">{{ booking.customerNotes || 'Keine Notizen' }}</p>
        </div>

        <!-- Actions -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; padding-top:8px; border-top:1px solid var(--ff-line); margin-top:auto;">
          <button *ngIf="booking.status === 'pending'" type="button" (click)="changeBookingStatus(booking.id, 'confirmed')" class="ff-btn ff-btn-ok">
            Bestätigen
          </button>
          <button *ngIf="booking.status === 'pending' || booking.status === 'confirmed'" type="button" (click)="changeBookingStatus(booking.id, 'cancelled')" class="ff-btn ff-btn-danger">
            Stornieren
          </button>
          <button *ngIf="booking.status === 'confirmed'" type="button" (click)="changeBookingStatus(booking.id, 'completed')" class="ff-btn ff-btn-ink">
            Abgeschlossen
          </button>
        </div>
      </div>
    </aside>
  `,
})
export class AdminBookingsPage {
  readonly authService = inject(AuthService);
  private readonly adminSetupApi = inject(AdminSetupApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);
  readonly savingManualBooking = signal(false);
  readonly createDrawerOpen = signal(false);
  readonly detailDrawerOpen = signal(false);
  readonly selectedDate = signal(getTodayIsoDate());
  readonly salon = signal<SalonProfile | null>(null);
  readonly services = signal<ServiceItem[]>([]);
  readonly openingHours = signal<OpeningHourSlot[]>([]);
  readonly bookings = signal<AdminBookingItem[]>([]);
  readonly weekCalendar = signal<AdminBookingCalendar | null>(null);
  readonly selectedBooking = signal<AdminBookingItem | null>(null);

  manualBookingForm: ManualBookingFormState = createEmptyManualBookingForm(getTodayIsoDate());

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

      const selectedDate = this.selectedDate();
      const weekDates = getWeekDates(selectedDate);
      const [salon, services, openingHours, bookings, weekCalendar] = await Promise.all([
        this.adminSetupApi.getSalon(),
        this.adminSetupApi.listServices(),
        this.adminSetupApi.getOpeningHours(),
        this.adminSetupApi.listBookings(selectedDate),
        this.adminSetupApi.listCalendarBookings(weekDates[0]!, weekDates[6]!),
      ]);

      this.salon.set(salon);
      this.services.set(services.filter((service) => service.active));
      this.openingHours.set(openingHours);
      this.bookings.set(bookings);
      this.weekCalendar.set(weekCalendar);

      if (!this.manualBookingForm.serviceId && services[0]) {
        this.manualBookingForm.serviceId = services[0].id;
      }

      this.manualBookingForm.startsAt = `${selectedDate}T09:00`;
      this.statusMessage.set(null);
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Die Termine konnten nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  salonName(): string {
    return this.salon()?.name ?? this.authService.adminProfile()?.salon.name ?? 'Termine';
  }

  weekDates(): string[] {
    return getWeekDates(this.selectedDate());
  }

  timelineRows(): TimelineRow[] {
    const openingRanges = this.openingHours()
      .filter((slot) => slot.weekday === getWeekdayIndex(this.selectedDate()))
      .sort((left, right) => left.startTime.localeCompare(right.startTime));

    if (openingRanges.length === 0) {
      return [];
    }

    const rows: TimelineRow[] = [];

    for (const range of openingRanges) {
      let current = timeToMinutes(range.startTime);
      const end = timeToMinutes(range.endTime);

      while (current < end) {
        const time = minutesToTime(current);
        rows.push({ time, label: time });
        current += 30;
      }
    }

    return rows;
  }

  bookingAt(time: string): AdminBookingItem | undefined {
    return this.bookings().find((booking) => toDateTimeLocalInput(booking.startsAt).slice(11, 16) === time);
  }

  countBookingsForDate(date: string): number {
    return this.weekCalendar()?.bookings.filter((booking) => booking.startsAt.slice(0, 10) === date).length ?? 0;
  }

  countStatus(status: AdminBookingStatus): number {
    return this.bookings().filter((booking) => booking.status === status).length;
  }

  setSelectedDate(date: string): void {
    this.selectedDate.set(date);
    void this.reload();
  }

  moveSelectedDate(amount: number): void {
    this.setSelectedDate(addDays(this.selectedDate(), amount));
  }

  jumpToToday(): void {
    this.setSelectedDate(getTodayIsoDate());
  }

  openCreateDrawer(time?: string): void {
    this.manualBookingForm = createEmptyManualBookingForm(this.selectedDate());
    this.manualBookingForm.serviceId = this.services()[0]?.id ?? '';

    if (time) {
      this.manualBookingForm.startsAt = `${this.selectedDate()}T${time}`;
    }

    this.createDrawerOpen.set(true);
    this.detailDrawerOpen.set(false);
  }

  async openDetailDrawer(bookingId: string): Promise<void> {
    this.loadError.set(null);

    try {
      const booking = await this.adminSetupApi.getBooking(bookingId);
      this.selectedBooking.set(booking);
      this.detailDrawerOpen.set(true);
      this.createDrawerOpen.set(false);
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Die Termindetails konnten nicht geladen werden.');
    }
  }

  closeDrawers(): void {
    this.createDrawerOpen.set(false);
    this.detailDrawerOpen.set(false);
    this.selectedBooking.set(null);
  }

  async saveManualBooking(): Promise<void> {
    this.savingManualBooking.set(true);
    this.loadError.set(null);

    try {
      const payload: AdminBookingPayload = {
        serviceId: this.manualBookingForm.serviceId,
        startsAt: new Date(this.manualBookingForm.startsAt).toISOString(),
        customer: {
          firstName: this.manualBookingForm.firstName.trim(),
          lastName: this.manualBookingForm.lastName.trim(),
          email: this.optionalValue(this.manualBookingForm.email),
          phone: this.optionalValue(this.manualBookingForm.phone),
        },
        customerNotes: this.optionalValue(this.manualBookingForm.customerNotes),
      };

      await this.adminSetupApi.createBooking(payload);
      this.statusMessage.set('Termin erfolgreich erstellt.');
      this.closeDrawers();
      await this.reload();
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Der Termin konnte nicht erstellt werden.');
    } finally {
      this.savingManualBooking.set(false);
    }
  }

  async changeBookingStatus(bookingId: string, status: AdminBookingStatus): Promise<void> {
    this.loadError.set(null);

    try {
      const booking = await this.adminSetupApi.updateBookingStatus(bookingId, status);
      this.selectedBooking.set(booking);
      this.statusMessage.set(`Terminstatus auf ${this.getStatusLabel(status)} gesetzt.`);
      await this.reload();
      this.selectedBooking.set(booking);
      this.detailDrawerOpen.set(true);
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Der Termin konnte nicht aktualisiert werden.');
    }
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
  }

  formatDate(value: string): string {
    return formatDateLabel(value);
  }

  formatLongDate(value: string): string {
    return formatLongDateLabel(value);
  }

  getShortWeekday(value: string): string {
    const weekdays = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];
    return weekdays[new Date(`${value}T12:00:00`).getDay()] ?? '';
  }

  getKW(value: string): number {
    const date = new Date(`${value}T12:00:00`);
    const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86_400_000) + 1;
    return Math.ceil(dayOfYear / 7);
  }

  formatDateTimeValue(value: string): string {
    return formatDateTime(value);
  }

  formatTimeValue(value: string): string {
    return formatTime(value);
  }

  formatMoneyValue(amount: number, currency: string): string {
    return formatMoney(amount, currency);
  }

  getStatusLabel(status: AdminBookingStatus): string {
    switch (status) {
      case 'pending':
        return 'ausstehend';
      case 'confirmed':
        return 'bestätigt';
      case 'cancelled':
        return 'storniert';
      case 'completed':
        return 'abgeschlossen';
    }
  }

  private optionalValue(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}