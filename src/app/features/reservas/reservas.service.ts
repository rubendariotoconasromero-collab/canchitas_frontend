import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../core/constants/api-endpoints';

export interface Cliente { id: number; sucursal: number; nombre: string; telefono: string; correo: string; documento: string; activo: boolean; }
export interface Branch { id: number; nombre: string; zona_horaria?: string; }
export interface CourtLink { id: number; cancha: number; sucursal: number; nombre: string; minutos: number; }
export interface CourtOption { id: number; sucursal: number; nombre: string; activa: boolean; }
export interface Span { inicio: string; fin: string; }
export interface Reservation {
  sucursal:number; origen:string;
  id: number; codigo: string; cliente: number | null; cliente_snapshot: { nombre: string; telefono: string; sin_cliente?: boolean }; estado: string;
  total: string; total_pagado: string; saldo_pendiente: string; retencion_hasta: string; horas_cancelacion: number; condiciones: string; notas: string;
  detalle: Span & { cancha: number; cancha_nombre: string; deporte_nombre: string; zona_horaria: string;
    desglose_tarifa: { nombre: string; minutos: number; importe: string }[] };
  historial: { accion: string; actor_nombre: string | null; created_at: string; datos: Record<string, unknown> }[];
}
export interface Block extends Span { id: number; cancha: number; cancha_nombre: string; motivo: string; activo: boolean; }
export interface Agenda {
  zona_horaria: string; canchas: {id: number; nombre: string; activa: boolean}[];
  horarios: (Span & { cancha: number })[]; reservas: Reservation[]; bloqueos: Block[];
}
export interface Quote { total: string; minutos: number; retencion_minutos: number; desglose: {nombre: string; minutos: number; importe: string}[]; }

@Injectable({providedIn: 'root'})
export class ReservasService {
  private readonly http = inject(HttpClient);
  private url(path: string) { return `${API_BASE_URL}/reservas/${path}`; }
  branches() { return this.http.get<Branch[]>(this.url('clientes/opciones/')); }
  options() { return this.http.get<{sucursales: Branch[]; canchas: CourtOption[]; canchas_deportes: CourtLink[]}>(this.url('reservas/opciones/')); }
  clients(branch: string, search = '') { return this.http.get<Cliente[]>(this.url('clientes/'), {params: {sucursal: branch, search}}); }
  saveClient(data: Partial<Cliente>, id?: number) {
    return id ? this.http.patch<Cliente>(this.url(`clientes/${id}/`), data) : this.http.post<Cliente>(this.url('clientes/'), data);
  }
  agenda(filters: Record<string, string>) { return this.http.get<Agenda>(this.url('reservas/agenda/'), {params: new HttpParams({fromObject: filters})}); }
  quote(data: object) { return this.http.post<Quote>(this.url('reservas/cotizar/'), data); }
  quoteMove(id: number, data: object) { return this.http.post<Quote>(this.url(`reservas/${id}/cotizar-reprogramacion/`), data); }
  reserve(data: object) { return this.http.post<Reservation>(this.url('reservas/'), data); }
  change(id: number, action: string, data: object = {}) { return this.http.post<Reservation>(this.url(`reservas/${id}/${action}/`), data); }
  block(data: object) { return this.http.post<Block>(this.url('bloqueos/'), data); }
  release(id: number) { return this.http.post<Block>(this.url(`bloqueos/${id}/liberar/`), {}); }
}

export function apiError(error: any): string {
  const value = error?.error;
  if (typeof value === 'string') return 'No se pudo comunicar con el servidor.';
  const flatten = (item: any): string[] => typeof item === 'string' ? [item] : item && typeof item === 'object' ? Object.values(item).flatMap(flatten) : [];
  return flatten(value).join(' ') || 'No se pudo completar la operacion.';
}
