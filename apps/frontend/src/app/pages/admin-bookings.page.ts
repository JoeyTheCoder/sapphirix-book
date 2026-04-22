import { NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

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
  imports: [FormsModule, NgFor, NgIf, RouterLink, ButtonModule],
  template: `
    <header class="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex items-center gap-4">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Sapphirix Book</p>
            <h1 class="text-lg font-semibold text-stone-900">{{ salonName() }}</h1>
          </div>
          <nav class="hidden items-center gap-1 rounded-full border border-stone-200 bg-white p-1 md:flex">
            <a
              routerLink="/admin"
              class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
              [class.bg-stone-900]="isActive('/admin')"
              [class.text-white]="isActive('/admin')"
              [class.text-stone-600]="!isActive('/admin')"
            >
              Bookings
            </a>
            <a
              routerLink="/admin/settings"
              class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
              [class.bg-stone-900]="isActive('/admin/settings')"
              [class.text-white]="isActive('/admin/settings')"
              [class.text-stone-600]="!isActive('/admin/settings')"
            >
              Settings
            </a>
          </nav>
        </div>

        <div class="flex items-center gap-2" *ngIf="authService.adminProfile() as profile">
          <div class="hidden text-right sm:block">
            <p class="text-sm font-medium text-stone-900">{{ profile.admin.firstName }} {{ profile.admin.lastName }}</p>
            <p class="text-xs text-stone-500">{{ profile.admin.email }}</p>
          </div>
          <button
            type="button"
            (click)="reload()"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
            title="Reload"
          >
            <i class="pi pi-refresh text-sm"></i>
          </button>
          <button
            type="button"
            (click)="logout()"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
            title="Sign out"
          >
            <i class="pi pi-sign-out text-sm"></i>
          </button>
        </div>
      </div>
    </header>

    <main class="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(15,118,110,0.12),_transparent_28%),linear-gradient(180deg,_#fafaf9,_#f5f5f4)]">
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div *ngIf="statusMessage()" class="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {{ statusMessage() }}
        </div>

        <div *ngIf="loadError()" class="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ loadError() }}
        </div>

        <div *ngIf="loading()" class="flex items-center justify-center py-24 text-stone-500">
          <i class="pi pi-spin pi-spinner mr-3 text-xl"></i>
          Loading bookings workspace...
        </div>

        <div *ngIf="!loading()" class="space-y-6">
          <section class="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div class="rounded-[28px] border border-stone-200 bg-white/90 p-5 shadow-[0_20px_60px_-40px_rgba(28,25,23,0.45)]">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Daily Calendar</p>
                  <h2 class="mt-1 text-2xl font-semibold text-stone-900">{{ formatLongDate(selectedDate()) }}</h2>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <button type="button" (click)="moveSelectedDate(-1)" class="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-900">
                    <i class="pi pi-angle-left mr-2 text-xs"></i>Previous
                  </button>
                  <button type="button" (click)="jumpToToday()" class="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-900">
                    Today
                  </button>
                  <button type="button" (click)="moveSelectedDate(1)" class="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-900">
                    Next<i class="pi pi-angle-right ml-2 text-xs"></i>
                  </button>
                  <input
                    type="date"
                    [ngModel]="selectedDate()"
                    (ngModelChange)="setSelectedDate($event)"
                    class="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none transition-colors focus:border-stone-400"
                  />
                </div>
              </div>

              <div class="mt-5 grid grid-cols-7 gap-2">
                <button
                  *ngFor="let day of weekDates()"
                  type="button"
                  (click)="setSelectedDate(day)"
                  class="rounded-2xl border px-3 py-3 text-left transition-all"
                  [class.border-stone-900]="day === selectedDate()"
                  [class.bg-stone-900]="day === selectedDate()"
                  [class.text-white]="day === selectedDate()"
                  [class.border-stone-200]="day !== selectedDate()"
                  [class.bg-white]="day !== selectedDate()"
                  [class.text-stone-800]="day !== selectedDate()"
                >
                  <p class="text-[11px] uppercase tracking-[0.2em]" [class.text-white]="day === selectedDate()" [class.text-stone-400]="day !== selectedDate()">{{ formatDate(day).split(',')[0] }}</p>
                  <p class="mt-2 text-lg font-semibold">{{ day.slice(8, 10) }}</p>
                  <p class="mt-2 text-xs" [class.text-white]="day === selectedDate()" [class.text-stone-500]="day !== selectedDate()">
                    {{ countBookingsForDate(day) }} bookings
                  </p>
                </button>
              </div>
            </div>

            <div class="rounded-[28px] border border-stone-200 bg-[#1c1917] p-5 text-stone-100 shadow-[0_20px_60px_-40px_rgba(28,25,23,0.7)]">
              <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200/80">Overview</p>
              <div class="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-sm text-stone-400">Bookings Today</p>
                  <p class="mt-2 text-3xl font-semibold text-white">{{ bookings().length }}</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-sm text-stone-400">Pending</p>
                  <p class="mt-2 text-3xl font-semibold text-white">{{ countStatus('pending') }}</p>
                </div>
                <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p class="text-sm text-stone-400">Confirmed</p>
                  <p class="mt-2 text-3xl font-semibold text-white">{{ countStatus('confirmed') }}</p>
                </div>
              </div>

              <button
                type="button"
                (click)="openCreateDrawer()"
                class="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-stone-950 transition-transform hover:-translate-y-0.5"
              >
                <i class="pi pi-plus mr-2 text-sm"></i>
                Create Manual Booking
              </button>
            </div>
          </section>

          <section class="rounded-[28px] border border-stone-200 bg-white/90 shadow-[0_20px_60px_-40px_rgba(28,25,23,0.45)]">
            <div class="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Interactive Calendar</p>
                <h3 class="mt-1 text-lg font-semibold text-stone-900">30 minute schedule</h3>
              </div>
              <p class="text-sm text-stone-500">Click an empty row to add a booking. Click a booking for details.</p>
            </div>

            <div *ngIf="timelineRows().length === 0" class="px-5 py-12 text-center text-stone-500">
              No opening hours configured for this day yet.
            </div>

            <div *ngIf="timelineRows().length > 0" class="divide-y divide-stone-100">
              <div *ngFor="let row of timelineRows()" class="grid grid-cols-[84px_1fr] gap-4 px-5 py-3">
                <div class="pt-2 text-sm font-medium text-stone-500">{{ row.label }}</div>
                <div class="min-h-16 rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-2">
                  <div *ngIf="bookingAt(row.time) as booking; else emptySlot">
                    <button
                      type="button"
                      (click)="openDetailDrawer(booking.id)"
                      class="flex w-full items-start justify-between rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-stone-300"
                    >
                      <div>
                        <div class="flex items-center gap-2">
                          <p class="text-sm font-semibold text-stone-900">{{ booking.customer.firstName }} {{ booking.customer.lastName }}</p>
                          <span
                            class="rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
                            [class.bg-amber-100]="booking.status === 'pending'"
                            [class.text-amber-700]="booking.status === 'pending'"
                            [class.bg-emerald-100]="booking.status === 'confirmed'"
                            [class.text-emerald-700]="booking.status === 'confirmed'"
                            [class.bg-slate-200]="booking.status === 'completed'"
                            [class.text-slate-700]="booking.status === 'completed'"
                            [class.bg-rose-100]="booking.status === 'cancelled'"
                            [class.text-rose-700]="booking.status === 'cancelled'"
                          >
                            {{ booking.status }}
                          </span>
                        </div>
                        <p class="mt-1 text-sm text-stone-600">{{ booking.service.name }}</p>
                        <p class="mt-1 text-xs text-stone-500">{{ formatTimeValue(booking.startsAt) }} - {{ formatTimeValue(booking.endsAt) }} · {{ formatMoneyValue(booking.priceAmount, booking.currency) }}</p>
                      </div>
                      <i class="pi pi-angle-right mt-1 text-stone-400"></i>
                    </button>
                  </div>

                  <ng-template #emptySlot>
                    <button
                      type="button"
                      (click)="openCreateDrawer(row.time)"
                      class="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm text-stone-500 transition-colors hover:bg-white hover:text-stone-800"
                    >
                      <span>Available for manual booking</span>
                      <i class="pi pi-plus-circle text-stone-400"></i>
                    </button>
                  </ng-template>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>

    <div *ngIf="createDrawerOpen() || detailDrawerOpen()" class="fixed inset-0 z-40 bg-stone-950/35" (click)="closeDrawers()"></div>

    <aside *ngIf="createDrawerOpen()" class="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-stone-200 bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b border-stone-200 px-6 py-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Manual Booking</p>
          <h3 class="mt-1 text-xl font-semibold text-stone-900">Create booking</h3>
        </div>
        <button type="button" (click)="closeDrawers()" class="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:text-stone-900">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <form class="space-y-5 px-6 py-6" (ngSubmit)="saveManualBooking()">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-stone-700">Service</label>
          <select [(ngModel)]="manualBookingForm.serviceId" name="serviceId" required class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-400">
            <option value="" disabled>Select a service</option>
            <option *ngFor="let service of services()" [value]="service.id">{{ service.name }} · {{ service.durationMinutes }} min</option>
          </select>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-stone-700">Starts at</label>
          <input [(ngModel)]="manualBookingForm.startsAt" name="startsAt" type="datetime-local" required class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-400" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-stone-700">First name</label>
            <input [(ngModel)]="manualBookingForm.firstName" name="firstName" required class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-400" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-stone-700">Last name</label>
            <input [(ngModel)]="manualBookingForm.lastName" name="lastName" required class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-400" />
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-stone-700">Email</label>
            <input [(ngModel)]="manualBookingForm.email" name="email" type="email" required class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-400" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-stone-700">Phone</label>
            <input [(ngModel)]="manualBookingForm.phone" name="phone" required class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-400" />
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-stone-700">Notes</label>
          <textarea [(ngModel)]="manualBookingForm.customerNotes" name="customerNotes" rows="4" class="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-400"></textarea>
        </div>

        <div class="flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
          <button type="button" (click)="closeDrawers()" class="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600">Cancel</button>
          <p-button type="submit" label="Create confirmed booking" [loading]="savingManualBooking()"></p-button>
        </div>
      </form>
    </aside>

    <aside *ngIf="detailDrawerOpen() && selectedBooking() as booking" class="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto border-l border-stone-200 bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b border-stone-200 px-6 py-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Booking Detail</p>
          <h3 class="mt-1 text-xl font-semibold text-stone-900">{{ booking.customer.firstName }} {{ booking.customer.lastName }}</h3>
        </div>
        <button type="button" (click)="closeDrawers()" class="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:text-stone-900">
          <i class="pi pi-times"></i>
        </button>
      </div>

      <div class="space-y-6 px-6 py-6">
        <div class="rounded-3xl bg-stone-950 p-5 text-stone-50">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm text-stone-400">Status</p>
              <p class="mt-1 text-2xl font-semibold capitalize">{{ booking.status }}</p>
            </div>
            <p class="rounded-full bg-white/10 px-3 py-1 text-sm">{{ formatMoneyValue(booking.priceAmount, booking.currency) }}</p>
          </div>
          <p class="mt-4 text-sm text-stone-300">{{ booking.service.name }} · {{ booking.service.durationMinutes }} min</p>
          <p class="mt-1 text-sm text-stone-300">{{ formatDateTimeValue(booking.startsAt) }} - {{ formatTimeValue(booking.endsAt) }}</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Email</p>
            <p class="mt-2 text-sm text-stone-900">{{ booking.customer.email || 'Not provided' }}</p>
          </div>
          <div class="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Phone</p>
            <p class="mt-2 text-sm text-stone-900">{{ booking.customer.phone || 'Not provided' }}</p>
          </div>
        </div>

        <div class="rounded-2xl border border-stone-200 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Customer Notes</p>
          <p class="mt-2 whitespace-pre-wrap text-sm text-stone-800">{{ booking.customerNotes || 'No customer notes' }}</p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button *ngIf="booking.status === 'pending'" type="button" (click)="changeBookingStatus(booking.id, 'confirmed')" class="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
            Confirm
          </button>
          <button *ngIf="booking.status === 'pending' || booking.status === 'confirmed'" type="button" (click)="changeBookingStatus(booking.id, 'cancelled')" class="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white">
            Cancel
          </button>
          <button *ngIf="booking.status === 'confirmed'" type="button" (click)="changeBookingStatus(booking.id, 'completed')" class="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">
            Complete
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
      this.loadError.set(error instanceof Error ? error.message : 'Failed to load bookings.');
    } finally {
      this.loading.set(false);
    }
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  salonName(): string {
    return this.salon()?.name ?? this.authService.adminProfile()?.salon.name ?? 'Bookings';
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
      this.loadError.set(error instanceof Error ? error.message : 'Failed to load booking detail.');
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
      this.statusMessage.set('Manual booking created as confirmed.');
      this.closeDrawers();
      await this.reload();
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Failed to create the booking.');
    } finally {
      this.savingManualBooking.set(false);
    }
  }

  async changeBookingStatus(bookingId: string, status: AdminBookingStatus): Promise<void> {
    this.loadError.set(null);

    try {
      const booking = await this.adminSetupApi.updateBookingStatus(bookingId, status);
      this.selectedBooking.set(booking);
      this.statusMessage.set(`Booking marked as ${status}.`);
      await this.reload();
      this.selectedBooking.set(booking);
      this.detailDrawerOpen.set(true);
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Failed to update the booking.');
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

  formatDateTimeValue(value: string): string {
    return formatDateTime(value);
  }

  formatTimeValue(value: string): string {
    return formatTime(value);
  }

  formatMoneyValue(amount: number, currency: string): string {
    return formatMoney(amount, currency);
  }

  private optionalValue(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}