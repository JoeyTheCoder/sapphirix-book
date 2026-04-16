import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { firebaseAuth } from './firebase-client';
import type {
  AdminBookingItem,
  OpeningHourSlot,
  ReplaceOpeningHoursPayload,
  SalonProfile,
  SalonProfilePayload,
  ServiceItem,
  ServicePayload,
  TimeOffBlock,
  TimeOffBlockPayload,
} from './admin-setup.types';
import { frontendEnv } from './frontend-env';

const adminApiBaseUrl = `${frontendEnv.apiBaseUrl}/admin`;

@Injectable({ providedIn: 'root' })
export class AdminSetupApiService {
  private readonly http = inject(HttpClient);

  private async createAuthHeaders(): Promise<HttpHeaders> {
    const user = firebaseAuth?.currentUser;

    if (!user) {
      throw new Error('No authenticated admin found.');
    }

    const idToken = await user.getIdToken();

    return new HttpHeaders({
      Authorization: `Bearer ${idToken}`,
    });
  }

  async getSalon(): Promise<SalonProfile> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(this.http.get<{ salon: SalonProfile }>(`${adminApiBaseUrl}/salon`, { headers }));
    return response.salon;
  }

  async updateSalon(payload: SalonProfilePayload): Promise<SalonProfile> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.patch<{ salon: SalonProfile }>(`${adminApiBaseUrl}/salon`, payload, { headers }),
    );
    return response.salon;
  }

  async uploadSalonLogo(file: File): Promise<SalonProfile> {
    const headers = await this.createAuthHeaders();
    const formData = new FormData();
    formData.append('logo', file);

    const response = await firstValueFrom(
      this.http.post<{ salon: SalonProfile }>(`${adminApiBaseUrl}/salon/logo`, formData, { headers }),
    );

    return response.salon;
  }

  async listServices(): Promise<ServiceItem[]> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(this.http.get<{ services: ServiceItem[] }>(`${adminApiBaseUrl}/services`, { headers }));
    return response.services;
  }

  async createService(payload: ServicePayload): Promise<ServiceItem> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.post<{ service: ServiceItem }>(`${adminApiBaseUrl}/services`, payload, { headers }),
    );
    return response.service;
  }

  async updateService(serviceId: string, payload: ServicePayload): Promise<ServiceItem> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.patch<{ service: ServiceItem }>(`${adminApiBaseUrl}/services/${serviceId}`, payload, { headers }),
    );
    return response.service;
  }

  async deleteService(serviceId: string): Promise<void> {
    const headers = await this.createAuthHeaders();
    await firstValueFrom(this.http.delete(`${adminApiBaseUrl}/services/${serviceId}`, { headers }));
  }

  async getOpeningHours(): Promise<OpeningHourSlot[]> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.get<{ openingHours: OpeningHourSlot[] }>(`${adminApiBaseUrl}/opening-hours`, { headers }),
    );
    return response.openingHours;
  }

  async replaceOpeningHours(payload: ReplaceOpeningHoursPayload): Promise<OpeningHourSlot[]> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.put<{ openingHours: OpeningHourSlot[] }>(`${adminApiBaseUrl}/opening-hours`, payload, { headers }),
    );
    return response.openingHours;
  }

  async listTimeOffBlocks(): Promise<TimeOffBlock[]> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.get<{ timeOffBlocks: TimeOffBlock[] }>(`${adminApiBaseUrl}/time-off-blocks`, { headers }),
    );
    return response.timeOffBlocks;
  }

  async createTimeOffBlock(payload: TimeOffBlockPayload): Promise<TimeOffBlock> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.post<{ timeOffBlock: TimeOffBlock }>(`${adminApiBaseUrl}/time-off-blocks`, payload, { headers }),
    );
    return response.timeOffBlock;
  }

  async deleteTimeOffBlock(blockId: string): Promise<void> {
    const headers = await this.createAuthHeaders();
    await firstValueFrom(this.http.delete(`${adminApiBaseUrl}/time-off-blocks/${blockId}`, { headers }));
  }

  async listUpcomingBookings(): Promise<AdminBookingItem[]> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.get<{ bookings: AdminBookingItem[] }>(`${adminApiBaseUrl}/bookings/upcoming`, { headers }),
    );
    return response.bookings;
  }
}