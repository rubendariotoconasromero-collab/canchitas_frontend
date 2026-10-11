import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/constants/api-endpoints';

export interface PaymentTotals {
  importe: string; cantidad: number;
  por_medio: {medio: string; importe: string; cantidad: number}[];
}
export interface DashboardReservation {
  id: number; cancha: string; cliente: string; inicio: string; fin: string;
  estado: string; total: string; retencion_hasta: string;
}
export interface DashboardSummary {
  perfil: 'administrador' | 'cajero' | 'recepcion' | 'consulta';
  actualizado_en: string;
  sucursales: {id: number; nombre: string}[];
  sucursal: {id: number; nombre: string; zona_horaria: string; fecha: string} | null;
  reservas: {
    total_dia: number; por_estado: Record<string, number>; pendientes_vigentes: number;
    pendientes: DashboardReservation[]; proximas: DashboardReservation[];
  } | null;
  caja: {
    cajas_disponibles: number; turnos_propios: number;
    turnos: {id: number; caja: string; responsable: string; apertura: string;
      monto_inicial: string; efectivo_esperado: string}[];
    mis_cobros_turnos_abiertos: PaymentTotals;
    ultimos_cobros: {id: number; numero: string; fecha: string; cliente: string;
      cancha: string; medio: string; importe: string; operador: string}[];
    administracion: {
      cobros_hoy: PaymentTotals; turnos_abiertos: number; cierres_con_diferencia: number;
      diferencia_neta: string;
      cierres: {id: number; caja: string; responsable: string; cierre: string;
        esperado: string; contado: string; diferencia: string}[];
    } | null;
  } | null;
}

@Injectable({providedIn: 'root'})
export class DashboardService {
  private readonly http = inject(HttpClient);
  summary(branch = '') {
    return this.http.get<DashboardSummary>(`${API_BASE_URL}/dashboard/resumen/`,
      {params: branch ? {sucursal: branch} : {}});
  }
}
