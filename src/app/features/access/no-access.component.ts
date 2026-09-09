import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-no-access',
  imports: [ButtonComponent],
  template: `<section class="main-content"><h2>Acceso no disponible</h2>
    <p>No tienes acceso a esta pantalla o no se pudo verificar tu sesion.</p>
    <app-button icon="refresh" (clicked)="retry()">Volver a comprobar</app-button>
    <app-button variant="outline-secondary" (clicked)="logout()">Cerrar sesion</app-button>
    </section>`,
})
export class NoAccessComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  retry(): void { this.router.navigate(['/dashboard']); }
  logout(): void {
    this.auth.logout().subscribe({ next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']) });
  }
}
