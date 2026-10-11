import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-no-access',
  imports: [ButtonComponent,PageHeaderComponent],
  template: `<section class="main-content"><app-page-header title="Acceso no disponible" icon="lock" [showBack]="false">
    <app-button icon="refresh" (clicked)="retry()">Volver a comprobar</app-button>
    <app-button variant="outline-secondary" (clicked)="logout()">Cerrar sesion</app-button>
    </app-page-header>
    <p>No tienes acceso a esta pantalla o no se pudo verificar tu sesion.</p>
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
