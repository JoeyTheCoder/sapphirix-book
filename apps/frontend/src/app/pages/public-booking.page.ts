import { NgFor, NgIf } from '@angular/common';
import { Component, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { PublicBookingApiService } from '../core/public-booking-api.service';
import { frontendEnv } from '../core/frontend-env';
import { TurnstileWidgetComponent } from '../shared/turnstile-widget.component';
import type {
  AvailabilityCalendarPreviewDay,
  AvailabilityCalendarPreviewResult,
  AvailabilitySlot,
  BookingConfirmation,
  PublicSalon,
  PublicService,
} from '../core/public-booking.types';

type BookingFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
};

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function getMonthForIsoDate(date: string): string {
  return date.slice(0, 7);
}

function addMonthsToIsoMonth(month: string, months: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber - 1 + months, 1));

  return `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);

  return new Intl.DateTimeFormat('de-CH', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);

  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function createEmptyBookingForm(): BookingFormState {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  };
}

function readErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === 'object' && error !== null) {
    const errorPayload = error as { error?: { error?: string }; message?: string };

    if (typeof errorPayload.error?.error === 'string') {
      return errorPayload.error.error;
    }

    if (typeof errorPayload.message === 'string') {
      return errorPayload.message;
    }
  }

  return fallbackMessage;
}

@Component({
  selector: 'app-public-booking-page',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, TurnstileWidgetComponent],
  template: `
    <!-- FadeFlow public booking page -->
    <div style="min-height:100vh;background:var(--ff-bg);">

      <!-- Header -->
      <header style="background:var(--ff-surface);border-bottom:1px solid var(--ff-line);padding:16px 24px;">
        <div style="max-width:720px;margin:0 auto;display:flex;align-items:center;gap:14px;">
          <div style="width:48px;height:48px;border-radius:var(--ff-r-md);border:1px solid var(--ff-line);overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--ff-bg-muted);flex-shrink:0;">
            <img *ngIf="logoUrl()" [src]="logoUrl()!" alt="Logo" style="width:48px;height:48px;object-fit:cover;" />
            <img *ngIf="!logoUrl()" src="assets/images/logo-notext.png" alt="FadeFlow" style="width:32px;height:32px;object-fit:contain;" />
          </div>
          <div *ngIf="salon() as s">
            <h1 style="font-size:18px;font-weight:700;color:var(--ff-ink);margin:0;">{{ s.name }}</h1>
            <p class="ff-mono" style="font-size:11px;color:var(--ff-ink-muted);margin:2px 0 0 0;">{{ s.addressLine1 }}{{ s.city ? ', ' + s.city : '' }}</p>
          </div>
        </div>
      </header>

      <!-- Loading / error -->
      <div *ngIf="loading()" style="display:flex;align-items:center;justify-content:center;padding:96px 24px;color:var(--ff-ink-muted);gap:12px;">
        <i class="pi pi-spin pi-spinner" style="font-size:20px;"></i> Wird geladen…
      </div>
      <div *ngIf="loadError()" style="max-width:720px;margin:24px auto;background:var(--ff-bad-soft);border:1px solid var(--ff-bad);border-radius:var(--ff-r-md);padding:14px 16px;font-size:13px;color:var(--ff-bad);">
        {{ loadError() }}
      </div>

      <!-- Main content -->
      <div *ngIf="!loading() && salon()" style="max-width:720px;margin:0 auto;padding:40px 24px;">

        <!-- Heading -->
        <div style="margin-bottom:40px;">
          <h2 class="ff-display" style="font-size:32px;color:var(--ff-ink);line-height:1.15;margin:0 0 12px 0;">
            Termin in <em style="color:var(--ff-accent);font-style:italic;">vier Schritten</em> buchen.
          </h2>
          <!-- Step indicator -->
          <div class="ff-mono" style="display:flex;gap:16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--ff-ink-faint);">
            <span [style.color]="currentStep() >= 1 ? 'var(--ff-accent-text)' : 'var(--ff-ink-faint)'">01 Leistung</span>
            <span style="color:var(--ff-line-strong);">→</span>
            <span [style.color]="currentStep() >= 2 ? 'var(--ff-accent-text)' : 'var(--ff-ink-faint)'">02 Datum</span>
            <span style="color:var(--ff-line-strong);">→</span>
            <span [style.color]="currentStep() >= 3 ? 'var(--ff-accent-text)' : 'var(--ff-ink-faint)'">03 Zeit</span>
            <span style="color:var(--ff-line-strong);">→</span>
            <span [style.color]="currentStep() >= 4 ? 'var(--ff-accent-text)' : 'var(--ff-ink-faint)'">04 Sie</span>
          </div>
        </div>

        <!-- Confirmation -->
        <div *ngIf="completedBooking() as booking"
          style="background:var(--ff-ok-soft);border:1px solid var(--ff-ok);border-radius:var(--ff-r-lg);padding:24px;margin-bottom:32px;">
          <p class="ff-mono" style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;color:var(--ff-ok);margin:0 0 8px 0;">BUCHUNG EINGEGANGEN</p>
          <h3 class="ff-display" style="font-size:22px;color:var(--ff-ink);margin:0 0 16px 0;">Anfrage gesendet!</h3>
          <p style="font-size:13px;color:var(--ff-ink-muted);margin:0 0 16px 0;">Deine Buchungsanfrage ist eingegangen und wird vom Salon bestätigt.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <p class="ff-mono" style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ff-ink-muted);margin:0 0 4px 0;">Leistung</p>
              <p style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">{{ booking.service.name }}</p>
            </div>
            <div>
              <p class="ff-mono" style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ff-ink-muted);margin:0 0 4px 0;">Termin</p>
              <p style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">{{ formatDateTimeValue(booking.startsAt) }}</p>
            </div>
          </div>
        </div>

        <!-- STEP 1: Service selection -->
        <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);margin-bottom:16px;overflow:hidden;">
          <div style="padding:16px 20px;border-bottom:1px solid var(--ff-line);display:flex;align-items:center;gap:12px;">
            <span class="ff-mono"
              style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;"
              [style.background]="currentStep() >= 1 ? 'var(--ff-accent)' : 'var(--ff-bg-muted)'"
              [style.color]="currentStep() >= 1 ? '#fff' : 'var(--ff-ink-muted)'">01</span>
            <h3 style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">Leistung wählen</h3>
          </div>
          <div style="padding:16px;display:flex;flex-direction:column;gap:8px;">
            <button *ngFor="let service of services()" type="button"
              (click)="selectService(service.id)"
              style="width:100%;text-align:left;padding:14px 16px;border-radius:var(--ff-r-md);cursor:pointer;transition:all 0.12s;display:flex;align-items:center;justify-content:space-between;gap:12px;"
              [style.background]="selectedService()?.id === service.id ? 'var(--ff-accent-soft)' : 'var(--ff-surface)'"
              [style.border]="selectedService()?.id === service.id ? '1px solid var(--ff-accent)' : '1px solid var(--ff-line)'"
              [style.border-left]="selectedService()?.id === service.id ? '3px solid var(--ff-accent)' : '1px solid var(--ff-line)'">
              <div>
                <p style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">{{ service.name }}</p>
                <p *ngIf="service.description" style="font-size:12px;color:var(--ff-ink-muted);margin:3px 0 0 0;">{{ service.description }}</p>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <p class="ff-mono" style="font-size:12px;font-weight:600;color:var(--ff-ink);margin:0;">{{ formatMoneyValue(service.priceAmount, service.currency) }}</p>
                <p class="ff-mono" style="font-size:11px;color:var(--ff-ink-muted);margin:2px 0 0 0;">{{ service.durationMinutes }} min</p>
              </div>
            </button>
            <p *ngIf="services().length === 0" style="font-size:13px;color:var(--ff-ink-muted);padding:8px 0;margin:0;">Keine Leistungen verfügbar.</p>
          </div>
        </div>

        <!-- STEP 2: Date selection -->
        <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);margin-bottom:16px;overflow:hidden;"
          [style.opacity]="currentStep() < 2 ? '0.45' : '1'">
          <div style="padding:16px 20px;border-bottom:1px solid var(--ff-line);display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span class="ff-mono"
                style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;"
                [style.background]="currentStep() >= 2 ? 'var(--ff-accent)' : 'var(--ff-bg-muted)'"
                [style.color]="currentStep() >= 2 ? '#fff' : 'var(--ff-ink-muted)'">02</span>
              <h3 style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">Datum wählen</h3>
            </div>
            <div *ngIf="calendarPreview()" style="display:flex;align-items:center;gap:8px;">
              <button type="button" (click)="prevMonth()"
                style="width:28px;height:28px;border-radius:50%;border:1px solid var(--ff-line);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ff-ink-muted);">
                <i class="pi pi-angle-left" style="font-size:12px;"></i>
              </button>
              <span class="ff-mono" style="font-size:12px;color:var(--ff-ink);">{{ formatMonthValue(calendarMonth()) }}</span>
              <button type="button" (click)="nextMonth()"
                style="width:28px;height:28px;border-radius:50%;border:1px solid var(--ff-line);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ff-ink-muted);">
                <i class="pi pi-angle-right" style="font-size:12px;"></i>
              </button>
            </div>
          </div>
          <div *ngIf="currentStep() >= 2" style="padding:16px;">
            <div *ngIf="calendarLoading()" style="text-align:center;padding:24px;color:var(--ff-ink-muted);font-size:13px;">
              <i class="pi pi-spin pi-spinner" style="margin-right:8px;"></i>Kalender wird geladen…
            </div>
            <div *ngIf="calendarError()" style="font-size:13px;color:var(--ff-bad);margin-bottom:8px;">{{ calendarError() }}</div>
            <div *ngIf="!calendarLoading() && calendarPreview()">
              <!-- Weekday header -->
              <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px;">
                <div *ngFor="let d of calendarWeekdays"
                  class="ff-mono" style="text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--ff-ink-faint);padding:4px 0;">
                  {{ d }}
                </div>
              </div>
              <!-- Calendar grid -->
              <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">
                <div *ngFor="let cell of calendarCells()" style="aspect-ratio:1;">
                  <div *ngIf="!cell" style="height:100%;"></div>
                  <button *ngIf="cell" type="button"
                    (click)="cell.available ? selectDate(cell.date) : null"
                    style="width:100%;height:100%;border-radius:var(--ff-r-sm);border:none;font-size:13px;font-weight:500;transition:all 0.12s;cursor:pointer;"
                    [style.background]="selectedDate() === cell.date ? 'var(--ff-accent)' : cell.available ? 'var(--ff-accent-soft)' : 'transparent'"
                    [style.color]="selectedDate() === cell.date ? '#fff' : cell.available ? 'var(--ff-accent-text)' : 'var(--ff-ink-faint)'"
                    [style.cursor]="cell.available ? 'pointer' : 'default'"
                    [disabled]="!cell.available">
                    {{ cell.day }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 3: Time slot selection -->
        <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);margin-bottom:16px;overflow:hidden;"
          [style.opacity]="currentStep() < 3 ? '0.45' : '1'">
          <div style="padding:16px 20px;border-bottom:1px solid var(--ff-line);display:flex;align-items:center;gap:12px;">
            <span class="ff-mono"
              style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;"
              [style.background]="currentStep() >= 3 ? 'var(--ff-accent)' : 'var(--ff-bg-muted)'"
              [style.color]="currentStep() >= 3 ? '#fff' : 'var(--ff-ink-muted)'">03</span>
            <h3 style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">Zeit wählen</h3>
          </div>
          <div *ngIf="currentStep() >= 3" style="padding:16px;">
            <div *ngIf="availabilityLoading()" style="text-align:center;padding:24px;color:var(--ff-ink-muted);font-size:13px;">
              <i class="pi pi-spin pi-spinner" style="margin-right:8px;"></i>Zeiten werden geladen…
            </div>
            <div *ngIf="availabilityError()" style="font-size:13px;color:var(--ff-bad);margin-bottom:8px;">{{ availabilityError() }}</div>
            <div *ngIf="!availabilityLoading() && availableSlots().length > 0" style="display:flex;flex-wrap:wrap;gap:8px;">
              <button *ngFor="let slot of availableSlots()" type="button"
                (click)="selectSlot(slot)"
                class="ff-mono"
                style="padding:8px 14px;border-radius:var(--ff-r-sm);font-size:12px;font-weight:600;cursor:pointer;border:1px solid;transition:all 0.12s;"
                [style.background]="selectedSlot()?.startsAt === slot.startsAt ? 'var(--ff-accent)' : 'transparent'"
                [style.color]="selectedSlot()?.startsAt === slot.startsAt ? '#fff' : 'var(--ff-accent-text)'"
                [style.border-color]="selectedSlot()?.startsAt === slot.startsAt ? 'var(--ff-accent)' : 'var(--ff-accent)'">
                {{ formatTimeOnly(slot.startsAt) }}
              </button>
            </div>
            <p *ngIf="!availabilityLoading() && availableSlots().length === 0 && selectedDate()"
              style="font-size:13px;color:var(--ff-ink-muted);margin:0;">Keine freien Zeiten für diesen Tag.</p>
          </div>
        </div>

        <!-- STEP 4: Personal details -->
        <div style="background:var(--ff-surface);border:1px solid var(--ff-line);border-radius:var(--ff-r-lg);overflow:hidden;"
          [style.opacity]="currentStep() < 4 ? '0.45' : '1'">
          <div style="padding:16px 20px;border-bottom:1px solid var(--ff-line);display:flex;align-items:center;gap:12px;">
            <span class="ff-mono"
              style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;"
              [style.background]="currentStep() >= 4 ? 'var(--ff-accent)' : 'var(--ff-bg-muted)'"
              [style.color]="currentStep() >= 4 ? '#fff' : 'var(--ff-ink-muted)'">04</span>
            <h3 style="font-size:14px;font-weight:600;color:var(--ff-ink);margin:0;">Ihre Angaben</h3>
          </div>
          <div *ngIf="currentStep() >= 4" style="padding:20px;">
            <!-- Booking summary -->
            <div style="background:var(--ff-bg-muted);border-radius:var(--ff-r-md);padding:14px 16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;gap:16px;">
              <div>
                <p style="font-size:13px;font-weight:600;color:var(--ff-ink);margin:0;">{{ selectedService()?.name }}</p>
                <p class="ff-mono" style="font-size:11px;color:var(--ff-ink-muted);margin:3px 0 0 0;">{{ formatDateTimeValue(selectedSlot()?.startsAt ?? '') }}</p>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <p class="ff-mono" style="font-size:13px;font-weight:700;color:var(--ff-ink);margin:0;">{{ formatMoneyValue(selectedService()?.priceAmount ?? 0, selectedService()?.currency ?? 'CHF') }}</p>
                <p class="ff-mono" style="font-size:11px;color:var(--ff-ink-muted);margin:2px 0 0 0;">{{ selectedService()?.durationMinutes }} min</p>
              </div>
            </div>

            <form (ngSubmit)="submitBooking()">
              <div *ngIf="submitError()" style="background:var(--ff-bad-soft);border:1px solid var(--ff-bad);border-radius:var(--ff-r-sm);padding:10px 14px;font-size:13px;color:var(--ff-bad);margin-bottom:16px;">
                {{ submitError() }}
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Vorname</label>
                  <input [(ngModel)]="bookingForm.firstName" name="firstName" required class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Nachname</label>
                  <input [(ngModel)]="bookingForm.lastName" name="lastName" required class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">E-Mail</label>
                  <input [(ngModel)]="bookingForm.email" name="email" type="email" required class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div>
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Telefon</label>
                  <input [(ngModel)]="bookingForm.phone" name="phone" required class="ff-input" style="width:100%;box-sizing:border-box;" />
                </div>
                <div style="grid-column:span 2;">
                  <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:6px;">Hinweise (optional)</label>
                  <textarea [(ngModel)]="bookingForm.notes" name="notes" rows="3" class="ff-input" style="width:100%;box-sizing:border-box;resize:vertical;"></textarea>
                </div>
              </div>
              <div *ngIf="botProtectionEnabled()" style="margin-top:16px;">
                <label style="display:block;font-size:12px;font-weight:500;color:var(--ff-ink-muted);margin-bottom:8px;">Sicherheitsprüfung</label>
                <app-turnstile-widget
                  [siteKey]="turnstileSiteKey()"
                  (tokenChange)="onBotProtectionTokenChange($event)"
                />
              </div>
              <button type="submit"
                style="margin-top:20px;width:100%;padding:14px;background:var(--ff-ink);color:#fff;border:none;border-radius:var(--ff-r-md);font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;"
                [disabled]="submitting() || !canSubmit()">
                <i [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-send'" style="font-size:14px;"></i>
                <span>{{ submitting() ? 'Wird gesendet…' : 'Buchungsanfrage senden' }}</span>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class PublicBookingPage {
  @ViewChild(TurnstileWidgetComponent) private turnstileWidget?: TurnstileWidgetComponent;

  private readonly route = inject(ActivatedRoute);
  private readonly bookingApi = inject(PublicBookingApiService);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly calendarLoading = signal(false);
  readonly calendarError = signal<string | null>(null);
  readonly availabilityLoading = signal(false);
  readonly availabilityError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly salon = signal<PublicSalon | null>(null);
  readonly services = signal<PublicService[]>([]);
  readonly calendarPreview = signal<AvailabilityCalendarPreviewResult | null>(null);
  readonly slots = signal<AvailabilitySlot[]>([]);
  readonly selectedServiceId = signal<string | null>(null);
  readonly selectedSlot = signal<AvailabilitySlot | null>(null);
  readonly completedBooking = signal<BookingConfirmation | null>(null);
  readonly visibleMonth = signal('');
  readonly botProtectionToken = signal<string | null>(null);
  readonly weekdayLabels = weekdayLabels;

  readonly bookingForm = createEmptyBookingForm();

  bookingDate = '';

  constructor() {
    void this.loadPage();
  }

  readonly calendarWeekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  currentStep(): number {
    if (!this.selectedServiceId()) return 1;
    if (!this.bookingDate) return 2;
    if (!this.selectedSlot()) return 3;
    return 4;
  }

  selectedDate(): string {
    return this.bookingDate;
  }

  calendarMonth(): string {
    return this.visibleMonth();
  }

  availableSlots(): AvailabilitySlot[] {
    return this.slots().filter((s) => s.available);
  }

  calendarCells(): Array<{ date: string; day: number; available: boolean } | null> {
    const days = this.calendarDays();
    if (days.length === 0) return [];
    const firstDate = new Date(`${days[0]!.date}T12:00:00Z`);
    const firstDayOfWeek = (firstDate.getUTCDay() + 6) % 7;
    const cells: Array<{ date: string; day: number; available: boolean } | null> = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (const d of days) {
      cells.push({ date: d.date, day: parseInt(d.date.slice(8), 10), available: d.selectable });
    }
    return cells;
  }

  formatTimeOnly(value: string): string {
    return new Date(value).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  }

  formatMonthValue(_month: string): string {
    return this.calendarMonthLabel();
  }

  prevMonth(): void {
    void this.showPreviousMonth();
  }

  nextMonth(): void {
    void this.showNextMonth();
  }

  selectDate(date: string): void {
    const day = this.calendarDays().find((d) => d.date === date);
    if (day?.selectable) void this.selectCalendarDay(day);
  }

  submitBooking(): void {
    void this.submit();
  }

  minBookableDate(): string {
    return toIsoDate(new Date());
  }

  maxBookableDate(): string {
    return toIsoDate(addDays(new Date(), 27));
  }

  minBookableMonth(): string {
    return getMonthForIsoDate(this.minBookableDate());
  }

  maxBookableMonth(): string {
    return getMonthForIsoDate(this.maxBookableDate());
  }

  logoUrl(): string | null {
    const logoUrl = this.salon()?.logoUrl;

    if (!logoUrl) {
      return null;
    }

    return logoUrl.startsWith('http') ? logoUrl : `${frontendEnv.assetBaseUrl}${logoUrl}`;
  }

  selectedService(): PublicService | null {
    return this.services().find((service) => service.id === this.selectedServiceId()) ?? null;
  }

  calendarDays(): AvailabilityCalendarPreviewDay[] {
    return this.calendarPreview()?.days ?? [];
  }

  calendarMonthLabel(): string {
    const visibleMonth = this.visibleMonth();
    return visibleMonth ? formatMonthLabel(visibleMonth) : '';
  }

  selectedDateLabel(): string {
    return this.bookingDate ? formatDateLabel(this.bookingDate) : 'Not selected';
  }

  isSelectedCalendarDay(day: AvailabilityCalendarPreviewDay): boolean {
    return this.bookingDate === day.date;
  }

  canGoToPreviousMonth(): boolean {
    const visibleMonth = this.visibleMonth();
    return visibleMonth.length > 0 && visibleMonth > this.minBookableMonth();
  }

  canGoToNextMonth(): boolean {
    const visibleMonth = this.visibleMonth();
    return visibleMonth.length > 0 && visibleMonth < this.maxBookableMonth();
  }

  async selectService(serviceId: string): Promise<void> {
    this.selectedServiceId.set(serviceId);
    this.selectedSlot.set(null);
    await this.loadCalendarPreview(true);
    await this.loadAvailability();
  }

  async showPreviousMonth(): Promise<void> {
    if (!this.canGoToPreviousMonth()) {
      return;
    }

    this.visibleMonth.set(addMonthsToIsoMonth(this.visibleMonth(), -1));
    await this.loadCalendarPreview(false);
  }

  async showNextMonth(): Promise<void> {
    if (!this.canGoToNextMonth()) {
      return;
    }

    this.visibleMonth.set(addMonthsToIsoMonth(this.visibleMonth(), 1));
    await this.loadCalendarPreview(false);
  }

  async selectCalendarDay(day: AvailabilityCalendarPreviewDay): Promise<void> {
    if (!day.selectable) {
      return;
    }

    this.bookingDate = day.date;
    this.selectedSlot.set(null);

    const selectedMonth = getMonthForIsoDate(day.date);

    if (selectedMonth !== this.visibleMonth()) {
      this.visibleMonth.set(selectedMonth);
      await this.loadCalendarPreview(false);
    }

    await this.loadAvailability();
  }

  selectSlot(slot: AvailabilitySlot): void {
    if (!slot.available) {
      return;
    }

    this.selectedSlot.set(slot);
  }

  canSubmit(): boolean {
    return Boolean(
      this.selectedServiceId() &&
        this.selectedSlot() &&
        this.bookingForm.firstName.trim() &&
        this.bookingForm.lastName.trim() &&
        this.bookingForm.email.trim() &&
        this.bookingForm.phone.trim() &&
        (!this.botProtectionEnabled() || this.botProtectionToken()),
    );
  }

  botProtectionEnabled(): boolean {
    return frontendEnv.botProtection.enabled && this.turnstileSiteKey().length > 0;
  }

  turnstileSiteKey(): string {
    return frontendEnv.botProtection.turnstileSiteKey;
  }

  onBotProtectionTokenChange(token: string | null): void {
    this.botProtectionToken.set(token);
  }

  async submit(): Promise<void> {
    const salon = this.salon();
    const selectedSlot = this.selectedSlot();
    const selectedServiceId = this.selectedServiceId();

    if (!salon || !selectedSlot || !selectedServiceId) {
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    try {
      const booking = await this.bookingApi.createBooking({
        salonSlug: salon.slug,
        serviceId: selectedServiceId,
        startsAt: selectedSlot.startsAt,
        customer: {
          firstName: this.bookingForm.firstName.trim(),
          lastName: this.bookingForm.lastName.trim(),
          email: this.bookingForm.email.trim(),
          phone: this.bookingForm.phone.trim(),
        },
        botProtectionToken: this.botProtectionToken() ?? undefined,
        customerNotes: this.bookingForm.notes.trim() || undefined,
      });

      this.completedBooking.set(booking);
      this.selectedSlot.set(null);
      this.bookingForm.notes = '';
      this.turnstileWidget?.reset();
      this.botProtectionToken.set(null);
      await this.loadCalendarPreview(false);
      await this.loadAvailability();
    } catch (error: unknown) {
      const message = readErrorMessage(error, 'Failed to create the booking.');
      this.submitError.set(message);

      if (message.toLowerCase().includes('bot verification')) {
        this.turnstileWidget?.reset();
        this.botProtectionToken.set(null);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  formatMoneyValue(amount: number, currency: string): string {
    return formatMoney(amount, currency);
  }

  formatDateTimeValue(value: string): string {
    return formatDateTime(value);
  }

  private async loadPage(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const salonSlug = this.route.snapshot.paramMap.get('salonSlug');

      if (!salonSlug) {
        throw new Error('Missing salon slug.');
      }

      const result = await this.bookingApi.getServices(salonSlug);
      this.salon.set(result.salon);
      this.services.set(result.services);
      this.bookingDate = this.minBookableDate();
      this.visibleMonth.set(getMonthForIsoDate(this.bookingDate));

      if (result.services.length > 0) {
        this.selectedServiceId.set(result.services[0]!.id);
        await this.loadCalendarPreview(true);
        await this.loadAvailability();
      }
    } catch (error: unknown) {
      this.loadError.set(readErrorMessage(error, 'Failed to load the booking page.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAvailability(): Promise<void> {
    const salon = this.salon();
    const serviceId = this.selectedServiceId();

    if (!salon || !serviceId || !this.bookingDate) {
      this.slots.set([]);
      return;
    }

    this.availabilityLoading.set(true);
    this.availabilityError.set(null);

    try {
      const availability = await this.bookingApi.getAvailability(salon.slug, serviceId, this.bookingDate);
      this.slots.set(availability.slots);
    } catch (error: unknown) {
      this.slots.set([]);
      this.availabilityError.set(readErrorMessage(error, 'Failed to load available slots.'));
    } finally {
      this.availabilityLoading.set(false);
    }
  }

  private async loadCalendarPreview(syncSelectedDate: boolean): Promise<void> {
    const salon = this.salon();
    const serviceId = this.selectedServiceId();
    const visibleMonth = this.visibleMonth();

    if (!salon || !serviceId || !visibleMonth) {
      this.calendarPreview.set(null);
      return;
    }

    this.calendarLoading.set(true);
    this.calendarError.set(null);

    try {
      const calendar = await this.bookingApi.getAvailabilityCalendarPreview(salon.slug, serviceId, visibleMonth);
      this.calendarPreview.set(calendar);

      if (syncSelectedDate) {
        const preferredDate = this.resolvePreferredBookingDate(calendar);

        if (preferredDate) {
          this.bookingDate = preferredDate;
        }
      }
    } catch (error: unknown) {
      this.calendarPreview.set(null);
      this.calendarError.set(readErrorMessage(error, 'Failed to load the calendar preview.'));
    } finally {
      this.calendarLoading.set(false);
    }
  }

  private resolvePreferredBookingDate(calendar: AvailabilityCalendarPreviewResult): string | null {
    const currentDay = calendar.days.find((day) => day.date === this.bookingDate && day.selectable);

    if (currentDay) {
      return currentDay.date;
    }

    const requestedMonthDay = calendar.days.find((day) => day.inRequestedMonth && day.selectable);

    if (requestedMonthDay) {
      return requestedMonthDay.date;
    }

    return calendar.days.find((day) => day.selectable)?.date ?? null;
  }
}
