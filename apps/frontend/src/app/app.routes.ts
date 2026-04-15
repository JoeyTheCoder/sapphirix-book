import { Routes } from '@angular/router';

import { adminAuthGuard } from './core/admin-auth.guard';
import { AdminLoginPage } from './pages/admin-login.page';
import { AdminShellPage } from './pages/admin-shell.page';

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
		component: AdminShellPage,
		canActivate: [adminAuthGuard],
	},
	{
		path: '**',
		redirectTo: 'admin/login',
	},
];
