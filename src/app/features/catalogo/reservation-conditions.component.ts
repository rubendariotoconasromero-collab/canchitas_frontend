import { Component } from '@angular/core';

@Component({
  selector: 'app-reservation-conditions',
  template: `
    <dl class="reservation-conditions" aria-label="Condiciones obligatorias de reserva">
      <div><dt>Pago para confirmar</dt><dd>100 % del importe de la reserva.</dd></div>
      <div><dt>Cancelaciones</dt><dd>Sin reembolso. Se conserva el pago registrado.</dd></div>
    </dl>
  `,
  styles: `
    .reservation-conditions { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 12px 24px; margin: 0 0 20px; padding: 12px 0; border-block: 1px solid #d8dce1; }
    dt { color: #34383d; font-size: 13px; margin-bottom: 4px; }
    dd { color: #222529; font-size: 14px; margin: 0; overflow-wrap: anywhere; }
  `,
})
export class ReservationConditionsComponent {}
