import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { firebaseAuth } from './firebase-client';
import type {
  AdminBookingCalendar,
  AdminBookingItem,
  AdminBookingPayload,
  AdminNotificationsResponse,
  AdminBookingStatus,
  OpeningHourSlot,
  ReplaceOpeningHoursPayload,
  SalonProfile,
  SalonProfilePayload,
  ServiceItem,
  ServicePayload,
  StaffMember,
  StaffMemberPayload,
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

  async getNotifications(): Promise<AdminNotificationsResponse> {
    const headers = await this.createAuthHeaders();
    return firstValueFrom(this.http.get<AdminNotificationsResponse>(`${adminApiBaseUrl}/notifications`, { headers }));
  }

  async markNotificationsAsRead(): Promise<void> {
    const headers = await this.createAuthHeaders();
    await firstValueFrom(this.http.post(`${adminApiBaseUrl}/notifications/read`, {}, { headers }));
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

  async listBookings(date: string, status?: AdminBookingStatus): Promise<AdminBookingItem[]> {
    const headers = await this.createAuthHeaders();
    const params = new URLSearchParams({ date });

    if (status) {
      params.set('status', status);
    }

    const response = await firstValueFrom(
      this.http.get<{ bookings: AdminBookingItem[] }>(`${adminApiBaseUrl}/bookings?${params.toString()}`, { headers }),
    );
    return response.bookings;
  }

  async getBooking(bookingId: string): Promise<AdminBookingItem> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.get<{ booking: AdminBookingItem }>(`${adminApiBaseUrl}/bookings/${bookingId}`, { headers }),
    );
    return response.booking;
  }

  async listCalendarBookings(startDate: string, endDate: string): Promise<AdminBookingCalendar> {
    const headers = await this.createAuthHeaders();
    const params = new URLSearchParams({ startDate, endDate });
    return firstValueFrom(this.http.get<AdminBookingCalendar>(`${adminApiBaseUrl}/bookings/calendar?${params.toString()}`, { headers }));
  }

  async createBooking(payload: AdminBookingPayload): Promise<AdminBookingItem> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.post<{ booking: AdminBookingItem }>(`${adminApiBaseUrl}/bookings`, payload, { headers }),
    );
    return response.booking;
  }

  async updateBookingStatus(bookingId: string, status: AdminBookingStatus): Promise<AdminBookingItem> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.patch<{ booking: AdminBookingItem }>(`${adminApiBaseUrl}/bookings/${bookingId}`, { status }, { headers }),
    );
    return response.booking;
  }

  async deleteBooking(bookingId: string): Promise<void> {
    const headers = await this.createAuthHeaders();
    await firstValueFrom(this.http.delete(`${adminApiBaseUrl}/bookings/${bookingId}`, { headers }));
  }

  async listStaffMembers(): Promise<StaffMember[]> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(this.http.get<{ staffMembers: StaffMember[] }>(`${adminApiBaseUrl}/staff-members`, { headers }));
    return response.staffMembers;
  }

  async createStaffMember(payload: StaffMemberPayload): Promise<StaffMember> {
    const headers = await this.createAuthHeaders();
    const response = await firstValueFrom(
      this.http.post<{ staffMember: StaffMember }>(`${adminApiBaseUrl}/staff-members`, payload, { headers }),
    );
    return response.staffMember;
  }

  async deleteStaffMember(staffMemberId: string): Promise<void> {
    const headers = await this.createAuthHeaders();
    await firstValueFrom(this.http.delete(`${adminApiBaseUrl}/staff-members/${staffMemberId}`, { headers }));
  }
}