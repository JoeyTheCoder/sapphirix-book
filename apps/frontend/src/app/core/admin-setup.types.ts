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

export type AdminBookingItem = {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  startsAt: string;
  endsAt: string;
  priceAmount: number;
  currency: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  service: {
    name: string;
  };
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