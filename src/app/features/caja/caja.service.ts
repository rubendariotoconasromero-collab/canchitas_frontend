import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/constants/api-endpoints';

export interface CashBox {id:number; nombre:string; sucursal:number; sucursal_nombre:string; zona_horaria:string; sesion_actual:number|null; activa:boolean;}
export interface PaymentMethod {id:number; nombre:string; efectivo:boolean;}
export interface CashSession {id:number; caja:number; caja_nombre:string; sucursal:number; responsable:number; responsable_nombre:string; apertura:string; cierre:string|null; monto_inicial:string; efectivo_esperado:string|null; efectivo_contado:string|null; diferencia:string|null; observaciones:string; resumen:{esperado:string; cobros_por_medio:Record<string,string>};}
export interface CashMovement {id:number; tipo:string; importe:string; efectivo:boolean; medio:string; motivo:string; actor_nombre:string; created_at:string;}
export interface Receipt {id:number; numero:string; reserva:number; sesion:number; created_at:string; recibido:string; cambio:string; referencia_externa:string; datos:{negocio:string; sucursal:string; caja:string; operador:string; cliente:{nombre:string}; codigo_reserva:string; cancha:string; deporte:string; inicio:string; fin:string; zona_horaria:string; importe:string; medio:string};}

@Injectable({providedIn:'root'})
export class CajaService {
  private readonly http=inject(HttpClient);
  private url(path:string){return `${API_BASE_URL}/caja/${path}`;}
  options(){return this.http.get<{cajas:CashBox[];medios:PaymentMethod[];sucursales:{id:number;nombre:string}[]}>(this.url('cajas/opciones/'));}
  createBox(name:string,branch:number){return this.http.post<CashBox>(this.url('cajas/'),{nombre:name,sucursal:branch});}
  boxes(){return this.http.get<CashBox[]>(this.url('cajas/'));}
  updateBox(id:number,data:{nombre?:string;activa?:boolean}){return this.http.patch<CashBox>(this.url(`cajas/${id}/`),data);}
  sessions(box:number){return this.http.get<CashSession[]>(this.url('sesiones/'),{params:{caja:box}});}
  movements(session:number){return this.http.get<CashMovement[]>(this.url(`sesiones/${session}/movimientos/`));}
  receipts(session:number){return this.http.get<Receipt[]>(this.url('recibos/'),{params:{sesion:session}});}
  receipt(id:number){return this.http.get<Receipt>(this.url(`recibos/${id}/`));}
  open(box:number,amount:number){return this.http.post<CashSession>(this.url(`cajas/${box}/abrir/`),{monto_inicial:amount});}
  move(session:number,data:object){return this.http.post<CashMovement>(this.url(`sesiones/${session}/movimiento/`),data);}
  close(session:number,data:object){return this.http.post<CashSession>(this.url(`sesiones/${session}/cerrar/`),data);}
  charge(data:object){return this.http.post<Receipt>(this.url('recibos/'),data);}
}
