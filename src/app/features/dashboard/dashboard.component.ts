import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { QuickAccessComponent } from '../../shared/components/quick-access/quick-access.component';
import { Component } from '@angular/core';
import { ButtonLinkComponent } from '../../shared/components/button/button-link.component';

@Component({
  selector: 'app-dashboard',
  imports: [ButtonLinkComponent, MetricCardComponent, QuickAccessComponent],
  template: `
    <div class="dashboard-page">
      <section class="dashboard-welcome">
        <div>
          <span class="eyebrow">Modulo de seguridad</span>
          <h2>Administracion de accesos</h2>
          <p>Gestiona las cuentas, los roles y los permisos de acceso desde un solo lugar.</p>
        </div>
        <app-button-link route="/usuarios" icon="person_add">
          Gestionar usuarios
        </app-button-link>
      </section>

      <section class="metric-grid" aria-label="Estado del sistema">
        <app-metric-card tone="green" icon="verified_user" label="Modulo disponible" value="Usuarios" />
        <app-metric-card tone="gold" icon="database" label="Base de datos" value="MySQL" />
        <app-metric-card tone="blue" icon="api" label="Servicios" value="Django REST" />
      </section>

      <section class="quick-access">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Accesos directos</span>
            <h3>Configuracion de seguridad</h3>
          </div>
        </div>

        <div class="quick-access-grid">
          <app-quick-access route="/usuarios" icon="group" label="Usuarios" description="Crear cuentas y asignar accesos" />
          <app-quick-access route="/roles" icon="admin_panel_settings" label="Roles" description="Agrupar permisos por responsabilidad" />
          <app-quick-access route="/permisos" icon="key" label="Permisos" description="Definir acciones disponibles" />
        </div>
      </section>
    </div>
  `,
})
export class DashboardComponent {}
