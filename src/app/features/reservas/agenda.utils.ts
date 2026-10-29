import { Reservation, Span } from './reservas.service';

export function hasPendingPayment(reservation: Pick<Reservation, 'estado' | 'saldo_pendiente'>): boolean {
  const balance = Number(reservation.saldo_pendiente);
  return reservation.estado === 'PENDIENTE' && Number.isFinite(balance) && balance > 0;
}

export function reservationActionLabel(action: string): string {
  const labels: Record<string, string> = {RETENER: 'Horario apartado', REPROGRAMAR: 'Reserva reprogramada',
    CONFIRMAR: 'Reserva confirmada', CANCELAR: 'Reserva cancelada', INICIAR: 'Servicio iniciado',
    FINALIZAR: 'Servicio finalizado', REGULARIZAR: 'Reserva regularizada', EXPIRAR: 'Plazo de pago vencido'};
  return Object.hasOwn(labels, action) ? labels[action] : action;
}

// Subtract occupied intervals from opening hours; adjacent intervals share no time.
export function freeIntervals(openings: Span[], occupied: Span[], now: number): Span[] {
  const merged: number[][] = [];
  for (const span of openings.map(x => [Date.parse(x.inicio), Date.parse(x.fin)]).sort((a,b) => a[0]-b[0])) {
    const last = merged[merged.length-1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]); else merged.push(span);
  }
  const busy = occupied.map(x => [Date.parse(x.inicio), Date.parse(x.fin)]).sort((a,b) => a[0]-b[0]);
  const result: Span[] = [];
  for (const [a,b] of merged) {
    let cursor = Math.max(a, now);
    for (const [x,y] of busy) {
      if (y <= cursor || x >= b) continue;
      if (x > cursor) result.push({inicio: new Date(cursor).toISOString(), fin: new Date(Math.min(x,b)).toISOString()});
      cursor = Math.max(cursor,y);
      if (cursor >= b) break;
    }
    if (cursor < b) result.push({inicio: new Date(cursor).toISOString(), fin: new Date(b).toISOString()});
  }
  return result;
}

export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0,10);
}

export function localDate(now: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get = (type: string) => parts.find(x=>x.type===type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
