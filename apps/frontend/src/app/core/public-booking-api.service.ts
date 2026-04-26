import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type {
  AvailabilityCalendarPreviewResult,
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
    const response = await firstValueFrom(this.http.get<{ salon: Omit<PublicSalon, 'staffMembers'> }>(`${publicApiBaseUrl}/salons/${slug}`));
    return { ...response.salon, staffMembers: [] };
  }

  async getServices(slug: string): Promise<{ salon: PublicSalon; services: PublicService[] }> {
    const response = await firstValueFrom(
      this.http.get<{ salon: Omit<PublicSalon, 'staffMembers'>; services: PublicService[]; staffMembers: { id: string; name: string }[] }>(
        `${publicApiBaseUrl}/salons/${slug}/services`,
      ),
    );
    return {
      salon: { ...response.salon, staffMembers: response.staffMembers ?? [] },
      services: response.services,
    };
  }

  async getAvailability(salonSlug: string, serviceId: string, date: string): Promise<AvailabilityResult> {
    const params = new HttpParams().set('serviceId', serviceId).set('date', date);
    const response = await firstValueFrom(
      this.http.get<{ availability: AvailabilityResult }>(`${publicApiBaseUrl}/salons/${salonSlug}/availability`, { params }),
    );

    return response.availability;
  }

  async getAvailabilityCalendarPreview(
    salonSlug: string,
    serviceId: string,
    month: string,
  ): Promise<AvailabilityCalendarPreviewResult> {
    const params = new HttpParams().set('serviceId', serviceId).set('month', month);
    const response = await firstValueFrom(
      this.http.get<{ calendar: AvailabilityCalendarPreviewResult }>(`${publicApiBaseUrl}/salons/${salonSlug}/availability-calendar`, {
        params,
      }),
    );

    return response.calendar;
  }

  async createBooking(payload: CreateBookingPayload): Promise<BookingConfirmation> {
    const response = await firstValueFrom(this.http.post<{ booking: BookingConfirmation }>(`${publicApiBaseUrl}/bookings`, payload));
    return response.booking;
  }
}