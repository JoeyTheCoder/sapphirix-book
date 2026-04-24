import { Injectable, inject, signal } from '@angular/core';

import { AdminSetupApiService } from './admin-setup-api.service';
import type { AdminNotificationItem } from './admin-setup.types';

const POLL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AdminNotificationsService {
  private readonly adminSetupApi = inject(AdminSetupApiService);

  readonly notifications = signal<AdminNotificationItem[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(false);
  readonly dropdownOpen = signal(false);

  private pollTimer: number | null = null;

  ensurePolling(): void {
    if (this.pollTimer !== null) {
      return;
    }

    void this.refresh();
    this.pollTimer = window.setInterval(() => {
      void this.refresh();
    }, POLL_INTERVAL_MS);
  }

  async refresh(): Promise<void> {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);

    try {
      const result = await this.adminSetupApi.getNotifications();
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