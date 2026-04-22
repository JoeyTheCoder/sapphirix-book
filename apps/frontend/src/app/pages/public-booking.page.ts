import { NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { PublicBookingApiService } from '../core/public-booking-api.service';
import { frontendEnv } from '../core/frontend-env';
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
  imports: [FormsModule, NgFor, NgIf],
  template: `
    <main class="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <div *ngIf="loadError()" class="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {{ loadError() }}
        </div>

        <div *ngIf="loading()" class="flex min-h-[50vh] flex-col items-center justify-center text-gray-500">
          <i class="pi pi-spin pi-spinner mb-3 text-3xl text-violet-500"></i>
          <p>Loading booking page…</p>
        </div>

        <div *ngIf="!loading() && salon() as currentSalon" class="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <section class="overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-500/20">
            <div class="p-8 sm:p-10">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                  <img *ngIf="logoUrl()" [src]="logoUrl()!" alt="Salon logo" class="h-10 w-10 rounded-xl object-cover" />
                  <i *ngIf="!logoUrl()" class="pi pi-sparkles text-lg"></i>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Online Booking</p>
                  <h1 class="text-3xl font-bold tracking-tight">{{ currentSalon.name }}</h1>
                </div>
              </div>

              <p class="mt-6 max-w-xl text-sm leading-6 text-violet-50/90">
                {{ currentSalon.description || 'Choose a service, pick a time, and send your booking request in one short flow.' }}
              </p>

              <div class="mt-8 grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                  <p class="text-xs uppercase tracking-wider text-white/60">Contact</p>
                  <p class="mt-1 text-sm text-white">{{ currentSalon.phone || currentSalon.email || 'Contact details available after booking' }}</p>
                </div>
                <div class="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                  <p class="text-xs uppercase tracking-wider text-white/60">Timezone</p>
                  <p class="mt-1 text-sm text-white">{{ currentSalon.timezone }}</p>
                </div>
              </div>

              <div class="mt-10 rounded-3xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-sm">
                <p class="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">How It Works</p>
                <ol class="mt-4 space-y-3 text-sm text-white/90">
                  <li>1. Pick one service for this booking.</li>
                  <li>2. Check the month preview and choose a highlighted day.</li>
                  <li>3. Choose one available start time.</li>
                  <li>4. Enter your details and send the request.</li>
                </ol>
              </div>
            </div>
          </section>

          <section class="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-900/5 sm:p-8">
            <div *ngIf="completedBooking() as booking" class="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <i class="pi pi-check-circle text-lg"></i>
                </div>
                <div>
                  <h2 class="text-base font-semibold">Booking request sent</h2>
                  <p class="mt-1 text-sm text-emerald-800">Your request is now pending confirmation by the salon.</p>
                  <div class="mt-4 grid gap-2 text-sm text-emerald-900 sm:grid-cols-2">
                    <div>
                      <p class="text-xs uppercase tracking-wide text-emerald-700">Service</p>
                      <p class="font-medium">{{ booking.service.name }}</p>
                    </div>
                    <div>
                      <p class="text-xs uppercase tracking-wide text-emerald-700">When</p>
                      <p class="font-medium">{{ formatDateTimeValue(booking.startsAt) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.25em] text-violet-500">Book Appointment</p>
              <h2 class="mt-2 text-2xl font-bold tracking-tight text-gray-900">Request an appointment</h2>
              <p class="mt-2 text-sm text-gray-500">One service per booking. Unavailable times stay visible but disabled.</p>
            </div>

            <div class="mt-8 space-y-8">
              <section>
                <div class="mb-3 flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-gray-900">1. Choose a service</h3>
                  <span class="text-xs text-gray-400">{{ services().length }} available</span>
                </div>

                <div *ngIf="services().length > 0" class="grid gap-3">
                  <button
                    *ngFor="let service of services()"
                    type="button"
                    (click)="selectService(service.id)"
                    class="rounded-2xl border px-4 py-4 text-left transition-all"
                    [class.border-violet-500]="selectedServiceId() === service.id"
                    [class.bg-violet-50]="selectedServiceId() === service.id"
                    [class.shadow-sm]="selectedServiceId() === service.id"
                    [class.border-gray-200]="selectedServiceId() !== service.id"
                    [class.bg-white]="selectedServiceId() !== service.id"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <h4 class="text-sm font-semibold text-gray-900">{{ service.name }}</h4>
                        <p class="mt-1 text-sm text-gray-500">{{ service.description || 'No description provided.' }}</p>
                      </div>
                      <div class="shrink-0 text-right">
                        <p class="text-sm font-semibold text-gray-900">{{ formatMoneyValue(service.priceAmount, service.currency) }}</p>
                        <p class="mt-1 text-xs text-gray-400">{{ service.durationMinutes }} min</p>
                      </div>
                    </div>
                  </button>
                </div>

                <div *ngIf="services().length === 0" class="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  This salon does not have bookable services yet.
                </div>
              </section>

              <section>
                <div class="mb-3 flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold text-gray-900">2. Pick a date</h3>
                  <span class="text-xs text-gray-400">{{ calendarPreview()?.totalAvailableDays || 0 }} bookable days</span>
                </div>

                <div *ngIf="calendarError()" class="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {{ calendarError() }}
                </div>

                <div class="rounded-3xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                  <div class="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      (click)="showPreviousMonth()"
                      [disabled]="!canGoToPreviousMonth() || calendarLoading()"
                      class="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 transition-all hover:border-violet-500 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <i class="pi pi-chevron-left"></i>
                    </button>

                    <div class="text-center">
                      <p class="text-sm font-semibold capitalize text-gray-900">{{ calendarMonthLabel() }}</p>
                      <p class="mt-1 text-xs text-gray-500">Tap a highlighted day to load the available start times.</p>
                    </div>

                    <button
                      type="button"
                      (click)="showNextMonth()"
                      [disabled]="!canGoToNextMonth() || calendarLoading()"
                      class="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 transition-all hover:border-violet-500 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <i class="pi pi-chevron-right"></i>
                    </button>
                  </div>

                  <div class="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                    <span *ngFor="let weekday of weekdayLabels">{{ weekday }}</span>
                  </div>

                  <div *ngIf="calendarLoading()" class="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                    Loading calendar preview…
                  </div>

                  <div *ngIf="!calendarLoading() && calendarDays().length > 0" class="mt-4 grid grid-cols-7 gap-2">
                    <button
                      *ngFor="let day of calendarDays()"
                      type="button"
                      [disabled]="!day.selectable"
                      (click)="selectCalendarDay(day)"
                      class="min-h-[4.5rem] rounded-2xl border px-2 py-2 text-left transition-all"
                      [class.opacity-45]="!day.inRequestedMonth"
                      [class.cursor-not-allowed]="!day.selectable"
                      [class.border-violet-500]="isSelectedCalendarDay(day)"
                      [class.bg-violet-600]="isSelectedCalendarDay(day)"
                      [class.text-white]="isSelectedCalendarDay(day)"
                      [class.border-emerald-200]="!isSelectedCalendarDay(day) && day.selectable"
                      [class.bg-emerald-50]="!isSelectedCalendarDay(day) && day.selectable"
                      [class.text-emerald-900]="!isSelectedCalendarDay(day) && day.selectable"
                      [class.border-gray-200]="!isSelectedCalendarDay(day) && !day.selectable"
                      [class.bg-white]="!isSelectedCalendarDay(day) && !day.selectable"
                      [class.text-gray-400]="!isSelectedCalendarDay(day) && !day.selectable"
                    >
                      <span class="block text-sm font-semibold">{{ day.dayOfMonth }}</span>
                      <span class="mt-1 block text-[10px] uppercase tracking-wide">
                        {{ day.available ? day.availableSlotCount + ' slots' : 'Unavailable' }}
                      </span>
                    </button>
                  </div>

                  <div *ngIf="!calendarLoading() && calendarDays().length === 0" class="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                    No calendar preview is available for this service yet.
                  </div>

                  <div class="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span class="inline-flex items-center gap-2">
                      <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                      Bookable day
                    </span>
                    <span class="inline-flex items-center gap-2">
                      <span class="h-2.5 w-2.5 rounded-full bg-gray-300"></span>
                      No valid slots
                    </span>
                    <span class="inline-flex items-center gap-2">
                      <span class="h-2.5 w-2.5 rounded-full bg-violet-500"></span>
                      Selected day
                    </span>
                  </div>
                </div>

                <p class="mt-3 text-sm text-gray-500">Selected date: <span class="font-medium text-gray-900">{{ selectedDateLabel() }}</span></p>
              </section>

              <section>
                <div class="mb-3 flex items-center justify-between gap-3">
                  <h3 class="text-sm font-semibold text-gray-900">3. Select a time</h3>
                  <span class="text-xs text-gray-400">30 min steps · {{ selectedService()?.durationMinutes || 0 }} min service</span>
                </div>

                <div *ngIf="availabilityError()" class="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {{ availabilityError() }}
                </div>

                <div *ngIf="availabilityLoading()" class="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  Loading time slots…
                </div>

                <div *ngIf="!availabilityLoading() && slots().length > 0" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <button
                    *ngFor="let slot of slots()"
                    type="button"
                    [disabled]="!slot.available"
                    (click)="selectSlot(slot)"
                    class="rounded-2xl border px-3 py-3 text-sm font-medium transition-all"
                    [class.cursor-not-allowed]="!slot.available"
                    [class.border-gray-200]="slot.available && selectedSlot()?.startsAt !== slot.startsAt"
                    [class.bg-white]="slot.available && selectedSlot()?.startsAt !== slot.startsAt"
                    [class.text-gray-700]="slot.available && selectedSlot()?.startsAt !== slot.startsAt"
                    [class.border-violet-500]="selectedSlot()?.startsAt === slot.startsAt"
                    [class.bg-violet-50]="selectedSlot()?.startsAt === slot.startsAt"
                    [class.text-violet-700]="selectedSlot()?.startsAt === slot.startsAt"
                    [class.border-gray-100]="!slot.available"
                    [class.bg-gray-100]="!slot.available"
                    [class.text-gray-400]="!slot.available"
                  >
                    <span class="block">{{ slot.label }}</span>
                    <span class="mt-1 block text-[11px] uppercase tracking-wide">{{ slot.available ? 'Available' : 'Unavailable' }}</span>
                  </button>
                </div>

                <div *ngIf="!availabilityLoading() && slots().length === 0" class="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No slots are available for the selected date.
                </div>
              </section>

              <section>
                <h3 class="mb-3 text-sm font-semibold text-gray-900">4. Your details</h3>
                <div class="grid gap-4 sm:grid-cols-2">
                  <input
                    [(ngModel)]="bookingForm.firstName"
                    name="firstName"
                    type="text"
                    placeholder="First name"
                    class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15"
                    required
                  />
                  <input
                    [(ngModel)]="bookingForm.lastName"
                    name="lastName"
                    type="text"
                    placeholder="Last name"
                    class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15"
                    required
                  />
                  <input
                    [(ngModel)]="bookingForm.email"
                    name="email"
                    type="email"
                    placeholder="Email address"
                    class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15"
                    required
                  />
                  <input
                    [(ngModel)]="bookingForm.phone"
                    name="phone"
                    type="tel"
                    placeholder="Phone number"
                    class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15"
                    required
                  />
                  <textarea
                    [(ngModel)]="bookingForm.notes"
                    name="notes"
                    rows="3"
                    placeholder="Notes for the salon (optional)"
                    class="sm:col-span-2 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15"
                  ></textarea>
                </div>
              </section>

              <section class="rounded-3xl bg-gray-50 p-5">
                <h3 class="text-sm font-semibold text-gray-900">Summary</h3>
                <div class="mt-4 space-y-2 text-sm text-gray-600">
                  <div class="flex items-center justify-between gap-4">
                    <span>Service</span>
                    <span class="font-medium text-gray-900">{{ selectedService()?.name || 'Not selected' }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <span>Price</span>
                    <span class="font-medium text-gray-900">{{ selectedService() ? formatMoneyValue(selectedService()!.priceAmount, selectedService()!.currency) : '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <span>Time</span>
                    <span class="font-medium text-gray-900">{{ selectedSlot() ? formatDateTimeValue(selectedSlot()!.startsAt) : 'Not selected' }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <span>Status after request</span>
                    <span class="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">Pending</span>
                  </div>
                </div>
              </section>

              <div *ngIf="submitError()" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {{ submitError() }}
              </div>

              <button
                type="button"
                (click)="submit()"
                [disabled]="submitting() || !canSubmit()"
                class="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <i [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-send'"></i>
                <span>{{ submitting() ? 'Sending request…' : 'Send booking request' }}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  `,
})
export class PublicBookingPage {
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
  readonly weekdayLabels = weekdayLabels;

  readonly bookingForm = createEmptyBookingForm();

  bookingDate = '';

  constructor() {
    void this.loadPage();
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
        this.bookingForm.phone.trim(),
    );
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
        customerNotes: this.bookingForm.notes.trim() || undefined,
      });

      this.completedBooking.set(booking);
      this.selectedSlot.set(null);
      this.bookingForm.notes = '';
      await this.loadCalendarPreview(false);
      await this.loadAvailability();
    } catch (error: unknown) {
      this.submitError.set(readErrorMessage(error, 'Failed to create the booking.'));
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
