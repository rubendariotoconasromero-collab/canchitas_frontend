import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/constants/api-endpoints';
import { Branch, Reservation } from './reservas.service';
import { PublicQuote } from '../publico/public.service';

export interface Solicitud {
  id:number;codigo:string;codigo_correlativo?:string;sucursal:number;cancha:string;deporte:string;zona_horaria:string;inicio:string;fin:string;
  nombre:string;telefono:string;correo:string;notas:string;total_cotizado:string;estado:string;condiciones_snapshot:{condiciones?:string;horas_cancelacion?:number;politica_version?:number};
  reserva:number|null;estado_reserva:string|null;revisado_at:string|null;motivo:string;created_at:string;
}
@Injectable({providedIn:'root'})
export class SolicitudesService {
  private readonly http=inject(HttpClient); private readonly url=API_BASE_URL+'/reservas/solicitudes/';
  branches(){return this.http.get<Branch[]>(this.url+'opciones/');}
  list(){return this.http.get<Solicitud[]>(this.url);}
  detail(id:number){return this.http.get<Solicitud>(this.url+`${id}/`);}
  quote(id:number){return this.http.post<PublicQuote>(this.url+`${id}/cotizar/`,{});}
  accept(id:number,quote:PublicQuote,client:string){return this.http.post<{solicitud:Solicitud;reserva:Reservation}>(this.url+`${id}/aceptar/`,{total_esperado:quote.total,condiciones_esperadas:quote.condiciones,horas_cancelacion_esperadas:quote.horas_cancelacion,...(client?{cliente:Number(client)}:{})});}
  reject(id:number,reason:string){return this.http.post<Solicitud>(this.url+`${id}/rechazar/`,{motivo:reason});}
  reservation(id:number){return this.http.get<Reservation>(`${API_BASE_URL}/reservas/reservas/${id}/`);}
}
