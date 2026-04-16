import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type {
  AvailabilityResult,
  BookingConfirmation,
  CreateBookingPayload,
  PublicSalon,
  PublicService,
} from './public-booking.types';
import { frontendEnv } from './frontend-env';

const publicApiBaseUrl = frontendEnv.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class PublicBookingApiService {
  private readonly http = inject(HttpClient);

  async getSalon(slug: string): Promise<PublicSalon> {
    const response = await firstValueFrom(this.http.get<{ salon: PublicSalon }>(`${publicApiBaseUrl}/salons/${slug}`));
    return response.salon;
  }

  async getServices(slug: string): Promise<{ salon: PublicSalon; services: PublicService[] }> {
    return firstValueFrom(this.http.get<{ salon: PublicSalon; services: PublicService[] }>(`${publicApiBaseUrl}/salons/${slug}/services`));
  }

  async getAvailability(salonSlug: string, serviceId: string, date: string): Promise<AvailabilityResult> {
    const params = new HttpParams().set('serviceId', serviceId).set('date', date);
    const response = await firstValueFrom(
      this.http.get<{ availability: AvailabilityResult }>(`${publicApiBaseUrl}/salons/${salonSlug}/availability`, { params }),
    );

    return response.availability;
  }

  async createBooking(payload: CreateBookingPayload): Promise<BookingConfirmation> {
    const response = await firstValueFrom(this.http.post<{ booking: BookingConfirmation }>(`${publicApiBaseUrl}/bookings`, payload));
    return response.booking;
  }
}