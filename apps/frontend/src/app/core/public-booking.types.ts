export type PublicSalon = {
  id: string;
  name: string;
  slug: string;
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
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceAmount: number;
  currency: string;
};

export type AvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  label: string;
  available: boolean;
  unavailableReason: string | null;
};

export type AvailabilityResult = {
  salon: {
    slug: string;
    name: string;
    timezone: string;
    bookingBufferMinutes: number;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceAmount: number;
    currency: string;
  };
  date: string;
  slotIntervalMinutes: number;
  minimumLeadTimeMinutes: number;
  bookingHorizonDays: number;
  slots: AvailabilitySlot[];
};

export type AvailabilityCalendarPreviewDay = {
  date: string;
  dayOfMonth: number;
  inRequestedMonth: boolean;
  available: boolean;
  selectable: boolean;
  availableSlotCount: number;
};

export type AvailabilityCalendarPreviewResult = {
  salon: {
    slug: string;
    name: string;
    timezone: string;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
  };
  month: string;
  today: string;
  latest: string;
  bookingHorizonDays: number;
  slotIntervalMinutes: number;
  minimumLeadTimeMinutes: number;
  totalAvailableDays: number;
  days: AvailabilityCalendarPreviewDay[];
};

export type CreateBookingPayload = {
  salonSlug: string;
  serviceId: string;
  startsAt: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  customerNotes?: string;
};

export type BookingConfirmation = {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  startsAt: string;
  endsAt: string;
  customerNotes: string | null;
  salon: {
    slug: string;
    name: string;
    timezone: string;
  };
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceAmount: number;
    currency: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
};