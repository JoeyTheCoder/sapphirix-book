import { Routes } from '@angular/router';

import { adminAuthGuard } from './core/admin-auth.guard';
import { AdminBookingsPage } from './pages/admin-bookings.page';
import { AdminLoginPage } from './pages/admin-login.page';
import { AdminShellPage } from './pages/admin-shell.page';
import { LegalPlaceholderPage } from './pages/legal-placeholder.page';
import { PublicBookingPage } from './pages/public-booking.page';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'admin/login',
	},
	{
		path: 'admin/login',
		component: AdminLoginPage,
	},
	{
		path: 'admin',
		component: AdminBookingsPage,
		canActivate: [adminAuthGuard],
	},
	{
		path: 'admin/settings',
		component: AdminShellPage,
		canActivate: [adminAuthGuard],
	},
	{
		path: 'impressum',
		component: LegalPlaceholderPage,
		data: { page: 'impressum' },
	},
	{
		path: 'datenschutz',
		component: LegalPlaceholderPage,
		data: { page: 'datenschutz' },
	},
	{
		path: 'agb',
		component: LegalPlaceholderPage,
		data: { page: 'agb' },
	},
	{
		path: 'kontakt',
		component: LegalPlaceholderPage,
		data: { page: 'kontakt' },
	},
	{
		path: 's/:salonSlug/book',
		redirectTo: ':salonSlug',
	},
	{
		path: ':salonSlug',
		component: PublicBookingPage,
	},
	{
		path: '**',
		redirectTo: 'admin/login',
	},
];
