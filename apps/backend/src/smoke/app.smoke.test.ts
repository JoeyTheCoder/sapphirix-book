import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../modules/salons/salons.service.js', () => ({
  getSalonBySlug: vi.fn(async (slug: string) => ({
    id: 'salon-1',
    slug,
    name: 'Demo Salon',
    email: 'demo@example.com',
    phone: '+41000000000',
    description: null,
    logoUrl: null,
    timezone: 'Europe/Zurich',
    addressLine1: 'Street 1',
    addressLine2: null,
    postalCode: '8000',
    city: 'Zurich',
    countryCode: 'CH',
  })),
  listServicesBySalonSlug: vi.fn(async (slug: string) => ({
    salon: {
      id: 'salon-1',
      slug,
      name: 'Demo Salon',
      email: 'demo@example.com',
      phone: '+41000000000',
      description: null,
      logoUrl: null,
      timezone: 'Europe/Zurich',
      addressLine1: 'Street 1',
      addressLine2: null,
      postalCode: '8000',
      city: 'Zurich',
      countryCode: 'CH',
    },
    services: [
      {
        id: 'service-1',
        name: 'Haircut',
        description: null,
        durationMinutes: 60,
        priceAmount: 5000,
        currency: 'CHF',
      },
    ],
  })),
}));

vi.mock('../modules/bookings/bookings.service.js', () => ({
  getAvailability: vi.fn(async ({ salonSlug, serviceId, date }: { salonSlug: string; serviceId: string; date: string }) => ({
    salon: { slug: salonSlug, name: 'Demo Salon', timezone: 'Europe/Zurich', bookingBufferMinutes: 10 },
    service: { id: serviceId, name: 'Haircut', durationMinutes: 60, priceAmount: 5000, currency: 'CHF' },
    date,
    slotIntervalMinutes: 30,
    minimumLeadTimeMinutes: 30,
    bookingHorizonDays: 28,
    slots: [
      {
        startsAt: '2026-04-25T09:00:00.000Z',
        endsAt: '2026-04-25T10:00:00.000Z',
        label: '09:00',
        available: true,
        unavailableReason: null,
      },
    ],
  })),
  getAvailabilityCalendarPreview: vi.fn(async ({ salonSlug, serviceId, month }: { salonSlug: string; serviceId: string; month: string }) => ({
    salon: { slug: salonSlug, name: 'Demo Salon', timezone: 'Europe/Zurich' },
    service: { id: serviceId, name: 'Haircut', durationMinutes: 60 },
    month,
    today: '2026-04-24',
    latest: '2026-05-21',
    bookingHorizonDays: 28,
    slotIntervalMinutes: 30,
    minimumLeadTimeMinutes: 30,
    totalAvailableDays: 1,
    days: [
      {
        date: '2026-04-25',
        dayOfMonth: 25,
        inRequestedMonth: true,
        available: true,
        selectable: true,
        availableSlotCount: 1,
      },
    ],
  })),
  createBooking: vi.fn(async (payload: { salonSlug: string; serviceId: string; startsAt: string; customer: { firstName: string; lastName: string; email: string; phone: string } }) => ({
    id: 'booking-1',
    status: 'pending',
    startsAt: payload.startsAt,
    endsAt: '2026-04-25T10:00:00.000Z',
    customerNotes: null,
    salon: { slug: payload.salonSlug, name: 'Demo Salon', timezone: 'Europe/Zurich' },
    service: { id: payload.serviceId, name: 'Haircut', durationMinutes: 60, priceAmount: 5000, currency: 'CHF' },
    customer: { id: 'customer-1', ...payload.customer },
  })),
}));

vi.mock('../middleware/require-admin-auth.js', () => ({
  requireAdminAuth: ((_: unknown, res: { locals: Record<string, unknown> }, next: () => void) => {
    res.locals.adminContext = {
      admin: {
        id: 'admin-1',
        firstName: 'Demo',
        lastName: 'Admin',
        email: 'admin@example.com',
      },
      salon: {
        id: 'salon-1',
        slug: 'demo-salon',
        name: 'Demo Salon',
        timezone: 'Europe/Zurich',
      },
    };
    next();
  }) as never,
}));

describe('app smoke flows', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/sapphirix_booking';
    process.env.PUBLIC_APP_ORIGIN = 'https://fadeflow.ch';
    process.env.BOT_PROTECTION_ENABLED = 'false';
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    vi.resetModules();
  });

  it('loads the public salon page data', async () => {
    const { createApp } = await import('../app.js');
    const response = await request(createApp()).get('/api/v1/salons/demo-salon/services');

    expect(response.status).toBe(200);
    expect(response.body.salon.slug).toBe('demo-salon');
    expect(response.body.services).toHaveLength(1);
  });

  it('allows browser requests from the configured frontend origin', async () => {
    const { createApp } = await import('../app.js');
    const response = await request(createApp())
      .get('/api/v1/salons/demo-salon/services')
      .set('origin', 'https://fadeflow.ch');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('https://fadeflow.ch');
  });

  it('blocks browser requests from unexpected origins', async () => {
    const { createApp } = await import('../app.js');
    const response = await request(createApp())
      .get('/api/v1/salons/demo-salon/services')
      .set('origin', 'https://evil.example');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('CORS origin is not allowed');
  });

  it('returns availability for a service and date', async () => {
    const { createApp } = await import('../app.js');
    const response = await request(createApp()).get('/api/v1/salons/demo-salon/availability').query({
      serviceId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      date: '2026-04-25',
    });

    expect(response.status).toBe(200);
    expect(response.body.availability.slots[0].available).toBe(true);
  });

  it('creates a booking through the public API', async () => {
    const { createApp } = await import('../app.js');
    const response = await request(createApp()).post('/api/v1/bookings').send({
      salonSlug: 'demo-salon',
      serviceId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      startsAt: '2026-04-25T09:00:00.000Z',
      customer: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '+41000000000',
      },
    });

    expect(response.status).toBe(201);
    expect(response.body.booking.status).toBe('pending');
  });

  it('resolves the protected admin context', async () => {
    const { createApp } = await import('../app.js');
    const response = await request(createApp()).get('/api/v1/admin/me').set('authorization', 'Bearer fake-token');

    expect(response.status).toBe(200);
    expect(response.body.admin.email).toBe('admin@example.com');
    expect(response.body.salon.slug).toBe('demo-salon');
  });
});