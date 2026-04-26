import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the root router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('should redirect the root path to the admin login', () => {
    expect(routes[0]).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'admin/login',
    });
  });

  it('should expose the legal routes', () => {
    const legalPaths = routes
      .filter((route) => ['impressum', 'datenschutz', 'agb', 'kontakt'].includes(route.path ?? ''))
      .map((route) => route.path);

    expect(legalPaths).toEqual(['impressum', 'datenschutz', 'agb', 'kontakt']);
  });
});
