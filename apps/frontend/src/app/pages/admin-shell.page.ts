import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { ButtonModule } from 'primeng/button';

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

const weekdayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  imports: [FormsModule, NgFor, NgIf, ButtonModule],
  template: `
    <!-- Top navigation bar â€” gradient -->
    <header class="sticky top-0 z-30 bg-gradient-to-r from-violet-700 to-fuchsia-600 shadow-lg shadow-violet-500/20">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white ring-1 ring-white/30">
            <i class="pi pi-sparkles text-sm"></i>
          </div>
          <span class="text-sm font-bold tracking-wide text-white">{{ salon()?.name || 'Sapphirix' }}</span>
        </div>

        <div class="flex items-center gap-1" *ngIf="authService.adminProfile() as profile">
          <span class="mr-2 hidden text-sm text-white/70 sm:inline">{{ profile.admin.firstName }} {{ profile.admin.lastName }}</span>
          <button type="button" (click)="reload()" title="Reload data"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white">
            <i class="pi pi-refresh text-sm"></i>
          </button>
          <button type="button" (click)="logout()" title="Sign out"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white">
            <i class="pi pi-sign-out text-sm"></i>
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <!-- Status / Error banners -->
      <div *ngIf="statusMessage()" class="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800 border-l-4 border-l-emerald-500">
        <i class="pi pi-check-circle shrink-0 text-emerald-600"></i>
        <span>{{ statusMessage() }}</span>
      </div>

      <div *ngIf="loadError()" class="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800 border-l-4 border-l-red-500">
        <i class="pi pi-times-circle shrink-0 text-red-500"></i>
        <span>{{ loadError() }}</span>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading()" class="flex flex-col items-center justify-center py-24 text-gray-400">
        <i class="pi pi-spin pi-spinner text-3xl mb-3 text-violet-500"></i>
        <p class="text-sm">Loading salon setupâ€¦</p>
      </div>

      <!-- Content -->
      <div *ngIf="!loading()" class="space-y-6">

        <!-- Gradient info cards -->
        <div class="grid gap-4 sm:grid-cols-2" *ngIf="authService.adminProfile() as profile">
          <div class="rounded-2xl bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600 p-5 shadow-lg shadow-violet-500/20 text-white">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                <i class="pi pi-user text-sm"></i>
              </div>
              <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Admin</p>
            </div>
            <h2 class="text-xl font-bold text-white">{{ profile.admin.firstName }} {{ profile.admin.lastName }}</h2>
            <p class="mt-1 text-sm text-white/70">{{ profile.admin.email }}</p>
          </div>

          <div class="rounded-2xl bg-gradient-to-br from-fuchsia-600 via-fuchsia-500 to-violet-600 p-5 shadow-lg shadow-fuchsia-500/20 text-white">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                <i class="pi pi-building text-sm"></i>
              </div>
              <p class="text-xs font-semibold uppercase tracking-widest text-white/60">Salon</p>
            </div>
            <h2 class="text-xl font-bold text-white">{{ salon()?.name || profile.salon.name }}</h2>
            <p class="mt-1 flex items-center gap-2 text-sm text-white/70">
              <span class="inline-flex items-center rounded-lg bg-white/15 px-2 py-0.5 text-xs font-mono text-white/90 ring-1 ring-white/20">{{ salon()?.slug || profile.salon.slug }}</span>
              <span>{{ salon()?.timezone || profile.salon.timezone }}</span>
            </p>
          </div>
        </div>

        <!-- Salon Profile + Logo -->
        <div class="grid gap-6 xl:grid-cols-[1fr_320px]">
          <!-- Profile form -->
          <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
            <div class="h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
            <form (ngSubmit)="saveSalonProfile()">
              <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 class="text-base font-semibold text-gray-900">Salon Profile</h2>
                  <p class="mt-0.5 text-sm text-gray-500">Business details visible to customers</p>
                </div>
                <p-button type="submit" label="Save" icon="pi pi-check" size="small" [loading]="savingProfile()"></p-button>
              </div>

              <div class="grid gap-4 p-6 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Salon name</label>
                  <input [(ngModel)]="salonForm.name" name="name" required
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                  <input [(ngModel)]="salonForm.email" name="email" type="email"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
                  <input [(ngModel)]="salonForm.phone" name="phone"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Timezone</label>
                  <input [(ngModel)]="salonForm.timezone" name="timezone" required
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Booking buffer (min)</label>
                  <input [(ngModel)]="salonForm.bookingBufferMinutes" name="bookingBufferMinutes" type="number" min="0" max="120" step="5"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>

                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Address line 1</label>
                  <input [(ngModel)]="salonForm.addressLine1" name="addressLine1"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>

                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Address line 2</label>
                  <input [(ngModel)]="salonForm.addressLine2" name="addressLine2"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Postal code</label>
                  <input [(ngModel)]="salonForm.postalCode" name="postalCode"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">City</label>
                  <input [(ngModel)]="salonForm.city" name="city"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Country code</label>
                  <input [(ngModel)]="salonForm.countryCode" name="countryCode" maxlength="2"
                    class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm uppercase text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>

                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                  <textarea [(ngModel)]="salonForm.description" name="description" rows="3"
                    class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15"></textarea>
                </div>
              </div>
            </form>
          </div>

          <!-- Logo upload -->
          <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
            <div class="h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
            <div class="border-b border-gray-100 px-6 py-4">
              <h2 class="text-base font-semibold text-gray-900">Logo</h2>
              <p class="mt-0.5 text-sm text-gray-500">JPG, PNG, or WEBP Â· max 5 MB</p>
            </div>

            <div class="p-6">
              <div class="flex items-center justify-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4 transition-colors hover:border-violet-300" style="min-height: 160px">
                <img *ngIf="logoUrl()" [src]="logoUrl()!" alt="Salon logo" class="max-h-36 rounded-xl object-contain" />
                <div *ngIf="!logoUrl()" class="text-center">
                  <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-500">
                    <i class="pi pi-image text-xl"></i>
                  </div>
                  <p class="text-xs text-gray-400">No logo uploaded yet</p>
                </div>
              </div>

              <label class="mt-4 block">
                <span class="mb-1.5 block text-sm font-medium text-gray-700">Choose image</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" (change)="uploadLogo($event)"
                  class="block w-full text-sm text-gray-500
                  file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-violet-600 file:to-fuchsia-600 file:px-3 file:py-2
                  file:text-sm file:font-medium file:text-white file:cursor-pointer
                  hover:file:brightness-110 file:transition-all file:shadow-sm file:shadow-violet-500/20" />
              </label>

              <p *ngIf="uploadingLogo()" class="mt-3 flex items-center gap-2 text-sm text-violet-600">
                <i class="pi pi-spin pi-spinner"></i> Uploadingâ€¦
              </p>
            </div>
          </div>
        </div>

        <!-- Upcoming bookings -->
        <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
          <div class="h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
          <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Upcoming Bookings</h2>
              <p class="mt-0.5 text-sm text-gray-500">New public booking requests appear here right away</p>
            </div>
            <span class="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100">
              {{ upcomingBookings().length }} entries
            </span>
          </div>

          <div *ngIf="upcomingBookings().length > 0" class="divide-y divide-gray-100">
            <article *ngFor="let booking of upcomingBookings()" class="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="truncate text-sm font-semibold text-gray-900">
                    {{ booking.customer.firstName }} {{ booking.customer.lastName }}
                  </h3>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                    [class.bg-amber-100]="booking.status === 'pending'"
                    [class.text-amber-700]="booking.status === 'pending'"
                    [class.bg-emerald-100]="booking.status === 'confirmed'"
                    [class.text-emerald-700]="booking.status === 'confirmed'"
                    [class.bg-gray-100]="booking.status !== 'pending' && booking.status !== 'confirmed'"
                    [class.text-gray-600]="booking.status !== 'pending' && booking.status !== 'confirmed'"
                  >
                    {{ booking.status }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-gray-500">{{ booking.service.name }}</p>
                <p class="mt-1 text-xs text-gray-400">{{ booking.customer.email || 'No email' }} · {{ booking.customer.phone || 'No phone' }}</p>
              </div>

              <div class="shrink-0 text-left sm:text-right">
                <p class="text-sm font-semibold text-gray-900">{{ formatDateTimeValue(booking.startsAt) }}</p>
                <p class="mt-1 text-xs text-gray-400">{{ formatMoneyValue(booking.priceAmount, booking.currency) }}</p>
              </div>
            </article>
          </div>

          <div *ngIf="upcomingBookings().length === 0" class="px-6 py-10 text-center">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
              <i class="pi pi-calendar text-xl"></i>
            </div>
            <p class="text-sm text-gray-500">No upcoming bookings yet.</p>
          </div>
        </div>

        <!-- Services -->
        <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
          <div class="h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
          <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Services</h2>
              <p class="mt-0.5 text-sm text-gray-500">Bookable offerings for your customers</p>
            </div>
            <p-button label="New service" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="resetServiceForm()"></p-button>
          </div>

          <!-- Service form -->
          <form class="border-b border-gray-100 bg-gradient-to-b from-violet-50/40 to-transparent p-6" (ngSubmit)="saveService()">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Service name</label>
                <input [(ngModel)]="serviceForm.name" name="serviceName" required
                  class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:ring-3 focus:ring-violet-500/15" />
              </div>

              <div class="sm:col-span-2">
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                <textarea [(ngModel)]="serviceForm.description" name="serviceDescription" rows="2"
                  class="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:ring-3 focus:ring-violet-500/15"></textarea>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Duration (min)</label>
                <input [(ngModel)]="serviceForm.durationMinutes" name="durationMinutes" type="number" min="5" step="5" required
                  class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:ring-3 focus:ring-violet-500/15" />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Price (cents)</label>
                <input [(ngModel)]="serviceForm.priceAmount" name="priceAmount" type="number" min="0" step="100" required
                  class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:ring-3 focus:ring-violet-500/15" />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Currency</label>
                <input [(ngModel)]="serviceForm.currency" name="currency" maxlength="3"
                  class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm uppercase text-gray-900 outline-none transition-all focus:border-violet-500 focus:ring-3 focus:ring-violet-500/15" />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Sort order</label>
                <input [(ngModel)]="serviceForm.sortOrder" name="sortOrder" type="number" min="0" step="1"
                  class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:ring-3 focus:ring-violet-500/15" />
              </div>
            </div>

            <div class="mt-4 flex items-center gap-3">
              <p-button type="submit" [label]="editingServiceId() ? 'Update' : 'Create'" icon="pi pi-check" size="small" [loading]="savingService()"></p-button>
              <p-button *ngIf="editingServiceId()" label="Cancel" severity="secondary" [text]="true" size="small" (onClick)="resetServiceForm()"></p-button>
            </div>
          </form>

          <!-- Service list -->
          <div class="divide-y divide-gray-100">
            <article *ngFor="let service of services()" class="flex items-center gap-4 px-6 py-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <i class="pi pi-tag text-sm"></i>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-semibold text-gray-900">{{ service.name }}</h3>
                <p class="mt-0.5 truncate text-xs text-gray-500">{{ service.description || 'No description' }}</p>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <span class="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                  {{ service.durationMinutes }} min
                </span>
                <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                  {{ formatMoneyValue(service.priceAmount, service.currency) }}
                </span>
                <p-button icon="pi pi-pencil" severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="startEditingService(service)"></p-button>
                <p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true" size="small" (onClick)="removeService(service.id)"></p-button>
              </div>
            </article>

            <div *ngIf="services().length === 0" class="px-6 py-12 text-center">
              <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                <i class="pi pi-box text-xl"></i>
              </div>
              <p class="text-sm text-gray-500">No services yet. Add your first offering above.</p>
            </div>
          </div>
        </div>

        <!-- Opening Hours -->
        <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
          <div class="h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
          <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Opening Hours</h2>
              <p class="mt-0.5 text-sm text-gray-500">Weekly schedule with split shifts</p>
            </div>
            <p-button label="Save hours" icon="pi pi-check" size="small" [loading]="savingOpeningHours()" (onClick)="saveOpeningHours()"></p-button>
          </div>

          <div class="divide-y divide-gray-100">
            <article *ngFor="let day of openingDays; let dayIndex = index" class="px-6 py-4">
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 min-w-[9rem]">
                  <h3 class="text-sm font-semibold text-gray-900">{{ day.label }}</h3>
                  <span *ngIf="day.slots.length === 0"
                    class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                    Closed
                  </span>
                </div>

                <div class="flex flex-1 flex-wrap items-center gap-2">
                  <span *ngFor="let slot of day.slots; let slotIndex = index"
                    class="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
                    <i class="pi pi-clock text-[10px]"></i>
                    {{ slot.startTime }} â€“ {{ slot.endTime }}
                    <button type="button"
                      class="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-violet-400 transition-colors hover:bg-violet-200 hover:text-violet-700"
                      (click)="removeOpeningSlot(dayIndex, slotIndex)">
                      <i class="pi pi-times text-[8px]"></i>
                    </button>
                  </span>
                </div>

                <button type="button"
                  class="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                  (click)="addOpeningSlot(dayIndex)"
                  *ngIf="day.slots.length < 3">
                  <i class="pi pi-plus text-[10px]"></i> Add shift
                </button>
              </div>

              <!-- Editable time inputs appear when a slot exists (below the pill row) -->
              <div *ngIf="day.slots.length > 0" class="mt-3 space-y-2">
                <div *ngFor="let slot of day.slots; let slotIndex = index"
                  class="flex items-center gap-3">
                  <input [(ngModel)]="slot.startTime" [name]="'start-' + day.weekday + '-' + slotIndex" type="time"
                    class="w-32 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                  <span class="text-xs text-gray-400">to</span>
                  <input [(ngModel)]="slot.endTime" [name]="'end-' + day.weekday + '-' + slotIndex" type="time"
                    class="w-32 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
                </div>
              </div>
            </article>
          </div>
        </div>

        <!-- Time Off -->
        <div class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5">
          <div class="h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
          <div class="border-b border-gray-100 px-6 py-4">
            <h2 class="text-base font-semibold text-gray-900">Time Off</h2>
            <p class="mt-0.5 text-sm text-gray-500">Closures, holidays, and blocked periods</p>
          </div>

          <div class="grid gap-6 p-6 lg:grid-cols-2">
            <!-- Time off form -->
            <form class="space-y-4" (ngSubmit)="saveTimeOffBlock()">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Starts at</label>
                <input [(ngModel)]="timeOffForm.startsAt" name="startsAt" type="datetime-local" required
                  class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Ends at</label>
                <input [(ngModel)]="timeOffForm.endsAt" name="endsAt" type="datetime-local" required
                  class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Reason</label>
                <input [(ngModel)]="timeOffForm.reason" name="timeOffReason" placeholder="e.g. Public holiday"
                  class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-violet-500 focus:bg-white focus:ring-3 focus:ring-violet-500/15" />
              </div>

              <p-button type="submit" label="Add period" icon="pi pi-plus" size="small" [loading]="savingTimeOff()"></p-button>
            </form>

            <!-- Time off list -->
            <div class="space-y-3">
              <article *ngFor="let block of timeOffBlocks()"
                class="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <i class="pi pi-ban text-sm"></i>
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-sm font-semibold text-gray-900">{{ block.reason || 'Blocked period' }}</h3>
                    <p class="mt-0.5 text-xs text-gray-500">{{ formatDateTimeValue(block.startsAt) }} â†’ {{ formatDateTimeValue(block.endsAt) }}</p>
                  </div>
                </div>
                <p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true" size="small" (onClick)="removeTimeOffBlock(block.id)"></p-button>
              </article>

              <div *ngIf="timeOffBlocks().length === 0" class="rounded-xl border-2 border-dashed border-gray-200 px-6 py-10 text-center">
                <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                  <i class="pi pi-calendar-times text-xl"></i>
                </div>
                <p class="text-sm text-gray-500">No blocked periods yet.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  `,
})
export class AdminShellPage {
  readonly authService = inject(AuthService);
  private readonly adminSetupApi = inject(AdminSetupApiService);

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
      const message = error instanceof Error ? error.message : 'Failed to load the salon setup.';
      this.loadError.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
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
      this.statusMessage.set('Salon profile saved.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Failed to save salon profile.');
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
      this.statusMessage.set('Salon logo uploaded.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Failed to upload the salon logo.');
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
        this.statusMessage.set('Service updated.');
      } else {
        const createdService = await this.adminSetupApi.createService(payload);
        this.services.set([...this.services(), createdService].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)));
        this.statusMessage.set('Service created.');
      }

      this.resetServiceForm();
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Failed to save the service.');
    } finally {
      this.savingService.set(false);
    }
  }

  async removeService(serviceId: string): Promise<void> {
    const shouldArchive = window.confirm('Archive this service? Existing bookings will keep their old reference.');

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

      this.statusMessage.set('Service archived.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Failed to archive the service.');
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
            throw new Error('Each opening-hour shift needs both a start and an end time.');
          }
        }
      }

      const openingHours = await this.adminSetupApi.replaceOpeningHours({ days });
      this.applyOpeningHours(openingHours);
      this.statusMessage.set('Opening hours saved.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Failed to save opening hours.');
    } finally {
      this.savingOpeningHours.set(false);
    }
  }

  async saveTimeOffBlock(): Promise<void> {
    this.savingTimeOff.set(true);
    this.loadError.set(null);

    try {
      if (!this.timeOffForm.startsAt || !this.timeOffForm.endsAt) {
        throw new Error('Start and end are required for a blocked period.');
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
      this.statusMessage.set('Blocked period added.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Failed to add the blocked period.');
    } finally {
      this.savingTimeOff.set(false);
    }
  }

  async removeTimeOffBlock(blockId: string): Promise<void> {
    const shouldDelete = window.confirm('Remove this blocked period?');

    if (!shouldDelete) {
      return;
    }

    this.loadError.set(null);

    try {
      await this.adminSetupApi.deleteTimeOffBlock(blockId);
      this.timeOffBlocks.set(this.timeOffBlocks().filter((block) => block.id !== blockId));
      this.statusMessage.set('Blocked period removed.');
    } catch (error: unknown) {
      this.loadError.set(error instanceof Error ? error.message : 'Failed to remove the blocked period.');
    }
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
