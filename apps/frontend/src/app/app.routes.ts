import { Routes } from '@angular/router';

import { adminAuthGuard } from './core/admin-auth.guard';
import { AdminBookingsPage } from './pages/admin-bookings.page';
import { AdminLoginPage } from './pages/admin-login.page';
import { AdminShellPage } from './pages/admin-shell.page';
import { PublicBookingPage } from './pages/public-booking.page';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'admin/login',
	},
	{
		path: 's/:salonSlug/book',
		component: PublicBookingPage,
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
		path: '**',
		redirectTo: 'admin/login',
	},
];
