import { Routes } from '@angular/router';

import { adminAuthGuard } from './core/admin-auth.guard';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'admin/login',
	},
	{
		path: 'admin/login',
		loadComponent: () => import('./pages/admin-login.page').then((module) => module.AdminLoginPage),
	},
	{
		path: 'admin',
		loadComponent: () => import('./pages/admin-bookings.page').then((module) => module.AdminBookingsPage),
		canActivate: [adminAuthGuard],
	},
	{
		path: 'admin/settings',
		loadComponent: () => import('./pages/admin-shell.page').then((module) => module.AdminShellPage),
		canActivate: [adminAuthGuard],
	},
	{
		path: 'impressum',
		loadComponent: () => import('./pages/legal-placeholder.page').then((module) => module.LegalPlaceholderPage),
		data: { page: 'impressum' },
	},
	{
		path: 'datenschutz',
		loadComponent: () => import('./pages/legal-placeholder.page').then((module) => module.LegalPlaceholderPage),
		data: { page: 'datenschutz' },
	},
	{
		path: 'agb',
		loadComponent: () => import('./pages/legal-placeholder.page').then((module) => module.LegalPlaceholderPage),
		data: { page: 'agb' },
	},
	{
		path: 'kontakt',
		loadComponent: () => import('./pages/legal-placeholder.page').then((module) => module.LegalPlaceholderPage),
		data: { page: 'kontakt' },
	},
	{
		path: 's/:salonSlug/book',
		redirectTo: ':salonSlug',
	},
	{
		path: ':salonSlug',
		loadComponent: () => import('./pages/public-booking.page').then((module) => module.PublicBookingPage),
	},
	{
		path: '**',
		redirectTo: 'admin/login',
	},
];
