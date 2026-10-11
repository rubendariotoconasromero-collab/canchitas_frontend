import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({providedIn:'root'})
export class PageNavigationService {
  private readonly router = inject(Router);
  private readonly pages: string[] = [];

  constructor() {
    this.remember(this.router.url);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(event => this.remember(event.urlAfterRedirects));
  }

  private remember(url: string): void {
    if (/^\/login(?:[/?#]|$)/.test(url)) { this.pages.length = 0; return; }
    if (/^\/sin-acceso(?:[/?#]|$)/.test(url)) return;
    if (url === '/' || url === this.pages.at(-1)) return;
    if (url.split(/[?#]/)[0] === this.pages.at(-1)?.split(/[?#]/)[0]) {
      this.pages[this.pages.length - 1] = url;
      return;
    }
    if (url === this.pages.at(-2)) this.pages.pop();
    else { this.pages.push(url); if (this.pages.length > 50) this.pages.shift(); }
  }

  back(route: string | null = null): void {
    const destination = route || this.pages.at(-2) || '/dashboard';
    void this.router.navigateByUrl(destination);
  }
}
