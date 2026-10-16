import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/constants/api-endpoints';

export type ReportType='reservas'|'cobros'|'cierres'|'ocupacion';
export type Filters=Record<string,string>;
export interface Choice {id:number;nombre:string;}
export interface ReportOptions {sucursales:Choice[];sucursal:number;canchas:Choice[];deportes:Choice[];cajas:Choice[];medios:Choice[];operadores:Choice[];}
export interface Page<T> {count:number;page:number;page_size:number;results:T[];}
export interface ReportRow {[key:string]:string|number|boolean;id:number|string;}
export interface ReportResult extends Page<ReportRow> {
  resumen:Record<string,string|number|Record<string,string>>;
  meta:{generado_en:string;criterio:string;alcance:string;sucursal_nombre:string;zona_horaria:string;desde:string;hasta:string;};
}
export interface AuditEvent {id:number;fecha:string;entidad:string;objeto_id:string;accion:string;actor:string;sucursal:string;anterior:Record<string,unknown>;nuevo:Record<string,unknown>;}
export interface Notice {tipo:string;id:number;titulo:string;fecha:string;ruta:string;params:Record<string,string>;}
export interface Notices {count:number;results:Notice[];limitado:boolean;actualizado_en:string;}

@Injectable({providedIn:'root'})
export class ReportesService {
  private readonly http=inject(HttpClient);
  options(branch=''){return this.http.get<ReportOptions>(`${API_BASE_URL}/reportes/opciones/`,{params:branch?{sucursal:branch}:{}});}
  report(kind:ReportType,params:Filters){return this.http.get<ReportResult>(`${API_BASE_URL}/reportes/${kind}/`,{params});}
  export(kind:ReportType,params:Filters,format:'xlsx'|'pdf'|'csv'='xlsx'){
    const path=format==='csv'?'':`${format}/`;
    return this.http.get(`${API_BASE_URL}/reportes/${kind}/exportar/${path}`,{params,responseType:'blob'});
  }
  audit(params:Filters){return this.http.get<Page<AuditEvent>&{sucursales:Choice[]}>(`${API_BASE_URL}/auditoria/`,{params});}
  notices(){return this.http.get<Notices>(`${API_BASE_URL}/avisos/`);}
}

export function todayInBolivia(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function displayDate(value:string){return value?new Date(value).toLocaleString('es-BO',{timeZone:'America/La_Paz'}):'';}
