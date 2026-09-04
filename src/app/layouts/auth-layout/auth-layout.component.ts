import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: `
    <main class="auth-shell">
      <section class="auth-panel">
        <router-outlet />
      </section>
    </main>
  `,
})
export class AuthLayoutComponent {}
