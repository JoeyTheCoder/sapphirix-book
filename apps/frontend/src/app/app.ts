import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-root',
  imports: [ButtonModule],
  template: `
    <main class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white shadow rounded-2xl p-8 text-center">
        <h1 class="text-3xl font-bold mb-4">Sapphirix Booking</h1>
        <p class="mb-6">Angular + Tailwind + PrimeNG is running.</p>
        <p-button label="Hello Frontend"></p-button>
      </div>
    </main>
  `,
})
export class App {}