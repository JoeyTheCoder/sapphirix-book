export type SalonProfile = {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  phone: string | null;
  description: string | null;
  logoUrl: string | null;
  timezone: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string;
  bookingBufferMinutes: number;
  updatedAt: string;
};

export type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceAmount: number;
  currency: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OpeningHourSlot = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
};

export type TimeOffBlock = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  createdAt: string;
};

export type AdminBookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type AdminBookingItem = {
  id: string;
  status: AdminBookingStatus;
  startsAt: string;
  endsAt: string;
  priceAmount: number;
  currency: string;
  customerNotes: string | null;
  internalNotes: string | null;
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
  };
};

export type AdminBookingCalendar = {
  startDate: string;
  endDate: string;
  bookings: AdminBookingItem[];
};

export type AdminNotificationItem = {
  id: string;
  type: 'new_booking_request';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  bookingId: string;
  startsAt: string;
  customerName: string;
  serviceName: string;
};

export type AdminNotificationsResponse = {
  unreadCount: number;
  notifications: AdminNotificationItem[];
};

export type AdminBookingPayload = {
  serviceId: string;
  startsAt: string;
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  customerNotes?: string;
};

export type AdminBookingStatusPayload = {
  status: AdminBookingStatus;
};

export type SalonProfilePayload = {
  name: string;
  email?: string;
  phone?: string;
  description?: string;
  timezone: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  countryCode: string;
  bookingBufferMinutes: number;
};

export type ServicePayload = {
  name: string;
  description?: string;
  durationMinutes: number;
  priceAmount: number;
  currency: string;
  sortOrder: number;
};

export type ReplaceOpeningHoursPayload = {
  days: Array<{
    weekday: number;
    slots: Array<{
      startTime: string;
      endTime: string;
    }>;
  }>;
};

export type TimeOffBlockPayload = {
  startsAt: string;
  endsAt: string;
  reason?: string;
};