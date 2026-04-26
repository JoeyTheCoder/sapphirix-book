import { Injectable, inject, signal } from '@angular/core';

import { AdminSetupApiService } from './admin-setup-api.service';
import { AuthService } from './auth.service';
import type { AdminNotificationItem } from './admin-setup.types';

const POLL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AdminNotificationsService {
  private readonly adminSetupApi = inject(AdminSetupApiService);
  private readonly authService = inject(AuthService);
  private notificationSignature: string | null = null;

  readonly notifications = signal<AdminNotificationItem[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);
  readonly dropdownOpen = signal(false);
  readonly bookingFeedVersion = signal(0);

  private pollTimer: number | null = null;

  ensurePolling(): void {
    void this.refreshWhenAuthenticated();

    if (this.pollTimer !== null) {
      return;
    }

    this.pollTimer = window.setInterval(() => {
      void this.refreshWhenAuthenticated();
    }, POLL_INTERVAL_MS);
  }

  private async refreshWhenAuthenticated(): Promise<void> {
    await this.authService.ensureInitialized();

    if (!this.authService.currentUser()) {
      this.notificationSignature = null;
      this.notifications.set([]);
      this.unreadCount.set(0);
      this.dropdownOpen.set(false);
      this.bookingFeedVersion.set(0);
      return;
    }

    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);

    try {
      const result = await this.adminSetupApi.getNotifications();
      const nextSignature = result.notifications.map((notification) => notification.id).join('|');

      if (this.notificationSignature === null) {
        this.notificationSignature = nextSignature;
      } else if (this.notificationSignature !== nextSignature) {
        this.notificationSignature = nextSignature;
        this.bookingFeedVersion.update((value) => value + 1);
      }

      this.notifications.set(result.notifications);
      this.unreadCount.set(result.unreadCount);
    } catch {
      // Keep the last known state when background polling fails.
    } finally {
      this.loading.set(false);
    }
  }

  async toggleDropdown(): Promise<void> {
    const nextOpen = !this.dropdownOpen();
    this.dropdownOpen.set(nextOpen);

    if (nextOpen && this.unreadCount() > 0) {
      await this.markAllAsRead();
    }
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  private async markAllAsRead(): Promise<void> {
    try {
      await this.adminSetupApi.markNotificationsAsRead();
      this.unreadCount.set(0);
      this.notifications.update((items) => items.map((item) => ({ ...item, read: true })));
    } catch {
      // The next poll will reconcile unread state if marking as read fails.
    }
  }
}