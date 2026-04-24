import { NgIf } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';

type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function ensureTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Turnstile.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-turnstile-script', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Turnstile.'));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

@Component({
  selector: 'app-turnstile-widget',
  standalone: true,
  imports: [NgIf],
  template: `
    <div #container></div>
    <p *ngIf="loadError" style="margin:8px 0 0 0;font-size:12px;color:#b91c1c;">{{ loadError }}</p>
  `,
})
export class TurnstileWidgetComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) siteKey = '';
  @Output() readonly tokenChange = new EventEmitter<string | null>();
  @ViewChild('container', { static: true }) private readonly container?: ElementRef<HTMLElement>;

  loadError: string | null = null;
  private widgetId: string | null = null;

  async ngAfterViewInit(): Promise<void> {
    if (!this.siteKey || !this.container) {
      return;
    }

    try {
      await ensureTurnstileScript();

      if (!window.turnstile) {
        throw new Error('Turnstile API did not initialize.');
      }

      this.widgetId = window.turnstile.render(this.container.nativeElement, {
        sitekey: this.siteKey,
        theme: 'light',
        callback: (token) => this.tokenChange.emit(token),
        'expired-callback': () => this.tokenChange.emit(null),
        'error-callback': () => this.tokenChange.emit(null),
      });
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : 'Failed to load bot protection.';
    }
  }

  reset(): void {
    if (this.widgetId && window.turnstile) {
      window.turnstile.reset(this.widgetId);
    }
  }

  ngOnDestroy(): void {
    if (this.widgetId && window.turnstile) {
      window.turnstile.remove(this.widgetId);
    }
  }
}