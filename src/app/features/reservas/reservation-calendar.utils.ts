import type { EventInput } from '@fullcalendar/core';
import type { Agenda, Reservation } from './reservas.service';
import { shiftDay } from './agenda.utils';

export type CalendarView = 'day' | 'week' | 'month';
export interface CalendarSelection { fecha: string; hora_inicio: string; hora_fin: string; cruza_medianoche: boolean; inicio: string; fin: string; }
export function calendarRange(day: string, view: CalendarView) {
  if (view === 'day') return {start: day, end: shiftDay(day, 1)};
  const anchor = view === 'month' ? day.slice(0, 7) + '-01' : day;
  const weekday = new Date(anchor + 'T12:00:00Z').getUTCDay();
  const start = shiftDay(anchor, -((weekday + 6) % 7));
  return {start, end: shiftDay(start, view === 'month' ? 42 : 7)};
}
export function moveCalendarDay(day: string, view: CalendarView, direction: number) {
  if (view !== 'month') return shiftDay(day, direction * (view === 'week' ? 7 : 1));
  const date = new Date(day.slice(0, 7) + '-01T12:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + direction);
  return date.toISOString().slice(0, 10);
}
export function occupies(r: Reservation, now: number) {
  return ['CONFIRMADA', 'EN_CURSO', 'FINALIZADA'].includes(r.estado) ||
    (r.estado === 'PENDIENTE' && Date.parse(r.retencion_hasta) > now);
}
export const STATE_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente de pago', CONFIRMADA: 'Confirmada', EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada', EXPIRADA: 'Retencion vencida',
};
export function calendarEvents(data: Agenda | null, state: string, now = Date.now()): EventInput[] {
  if (!data) return [];
  const events: EventInput[] = data.reservas.flatMap(r => {
    const hidden = !!state && r.estado !== state;
    if (hidden && !occupies(r, now)) return [];
    const expired = r.estado === 'PENDIENTE' && !occupies(r, now);
    return [{id: 'reserva-' + r.id, start: r.detalle.inicio, end: r.detalle.fin,
      title: hidden ? 'Ocupado · ' + r.detalle.cancha_nombre : `${r.detalle.cancha_nombre} · ${r.cliente_snapshot.nombre}`,
      display: hidden ? 'background' : 'auto',
      classNames: ['reservation-event', 'state-' + (expired ? 'EXPIRADA' : r.estado).toLowerCase()],
      extendedProps: {kind: 'reservation', id: r.id, label: expired ? STATE_LABELS['EXPIRADA'] : STATE_LABELS[r.estado]},
    }];
  });
  events.push(...data.bloqueos.map(b => ({id: 'bloqueo-' + b.id, start: b.inicio, end: b.fin,
    title: `Bloqueo · ${b.cancha_nombre}`, classNames: ['reservation-event', 'state-block'],
    extendedProps: {kind: 'block', id: b.id, label: b.motivo},
  })));
  return events;
}
export function selectionDraft(start: string, end: string): CalendarSelection | null {
  const fecha = start.slice(0, 10), endDay = end.slice(0, 10);
  if (endDay !== fecha && endDay !== shiftDay(fecha, 1)) return null;
  return {fecha, hora_inicio: start.slice(11, 16), hora_fin: end.slice(11, 16), cruza_medianoche: fecha !== endDay, inicio: start, fin: end};
}
