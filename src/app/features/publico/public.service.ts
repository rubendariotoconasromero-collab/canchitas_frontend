import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/constants/api-endpoints';
import { Observable, catchError, shareReplay, switchMap, tap, throwError } from 'rxjs';

export interface PublicBranch {id:number;nombre:string;direccion:string;telefono:string;latitud:string|null;longitud:string|null;zona_horaria:string;}
export interface PublicSlide {id:number;titulo:string;descripcion:string;imagen:string;alt:string;texto_boton:string;destino:'CANCHAS'|'CONTACTO'|'SEGUIMIENTO';}
export interface PublicWeb {lema:string;descripcion_intro:string;horario_atencion:string;seo_titulo:string;seo_descripcion:string;mostrar_deportes:boolean;mostrar_canchas:boolean;mostrar_contacto:boolean;
  slides:PublicSlide[];secciones:{id:number;tipo:string;titulo:string;contenido:string;imagen:string;alt:string}[];
  deportes:{id:number;nombre:string;descripcion:string;imagen:string;alt:string}[];contactos:{id:number;tipo:string;etiqueta:string;valor:string}[];redes:{id:number;plataforma:string;url:string}[];}
export interface PublicBusiness {nombre:string;descripcion:string;telefono:string;correo:string;logo:string;portada:string;sitio_web:string;moneda:string;sucursales:PublicBranch[];web?:PublicWeb|null;}
export interface PublicCourt {id:number;nombre:string;descripcion:string;sucursal:PublicBranch;superficie:string;ancho_metros:string|null;largo_metros:string|null;area_m2:string|null;techada:boolean;iluminacion:boolean;capacidad:number;minutos_minimos:number;precio_desde:string|null;deportes:{id:number;nombre:string}[];fotos:{url:string;descripcion:string}[];}
export interface PublicQuote {inicio:string;fin:string;total:string;moneda:string;minutos:number;plazo_pago_minutos:number;horas_cancelacion:number;condiciones:string;desglose:{nombre:string;minutos:number;importe:string}[];}
export interface Tracking {codigo:string;codigo_correlativo?:string;codigo_reserva?:string|null;estado:string;cancha:string;deporte:string;inicio:string;fin:string;zona_horaria:string;total:string;moneda:string;estado_reserva:string|null;plazo_pago:string|null;motivo:string;seguimiento_hasta:string;condiciones:string;horas_cancelacion:number|null;token?:string;}
export const requestLabels:Record<string,string>={PENDIENTE:'Pendiente de revision',ACEPTADA:'Solicitud aceptada',RECHAZADA:'Solicitud rechazada',VENCIDA:'Solicitud vencida'};
export interface PublicHistoryRow extends Tracking {estado_publico:string;creado_at:string;sucursal:string;cancha_id:number;cancha_deporte_id:number;cancha_disponible:boolean;}
export interface PublicHistoryResult {count:number;page:number;page_size:number;results:PublicHistoryRow[];actualizado_at:string;}
interface HistoryContext {csrf:string;acceso_hasta:string;}

@Injectable({providedIn:'root'})
export class PublicService {
  private readonly http=inject(HttpClient);
  private readonly url=API_BASE_URL+'/publico/';
  private historyContext?:Observable<HistoryContext>;
  private context(){
    if(!this.historyContext)this.historyContext=this.http.get<HistoryContext>(this.url+'historial/contexto/',{withCredentials:true}).pipe(
      catchError(error=>{this.historyContext=undefined;return throwError(()=>error);}),shareReplay({bufferSize:1,refCount:false}));
    return this.historyContext;
  }
  private historyRequest<T>(request:(context:HistoryContext)=>Observable<T>){
    return this.context().pipe(switchMap(request),catchError(error=>{if(error.status===403)this.historyContext=undefined;return throwError(()=>error);}));
  }
  business(){return this.http.get<PublicBusiness>(this.url+'negocio/');}
  courts(branch='',search=''){return this.http.get<PublicCourt[]>(this.url+'canchas/',{params:{sucursal:branch,buscar:search}});}
  court(id:number){return this.http.get<PublicCourt>(this.url+`canchas/${id}/`);}
  availability(id:number,day:string){return this.http.get<{zona_horaria:string;intervalos:{inicio:string;fin:string}[]}>(this.url+`canchas/${id}/disponibilidad/`,{params:{fecha:day}});}
  quote(data:Record<string,unknown>){return this.http.post<PublicQuote>(this.url+'cotizar/',data);}
  submit(data:Record<string,unknown>){return this.historyRequest(context=>this.http.post<Tracking>(this.url+'solicitudes/',data,{withCredentials:true,headers:{'X-CSRFToken':context.csrf}}));}
  track(code:string,token:string){return this.http.post<Tracking>(this.url+'seguimiento/',{codigo:code,token});}
  requestHistory(params:Record<string,string>){return this.historyRequest(()=>this.http.get<PublicHistoryResult>(this.url+'historial/',{params,withCredentials:true}));}
  historyDetail(code:string){return this.historyRequest(()=>this.http.get<PublicHistoryRow>(this.url+'historial/'+encodeURIComponent(code)+'/',{withCredentials:true}));}
  importRequest(code:string,token:string){return this.historyRequest(context=>this.http.post<PublicHistoryRow>(this.url+'historial/importar/',{codigo:code,token},{withCredentials:true,headers:{'X-CSRFToken':context.csrf}}));}
  removeFromHistory(code:string){return this.historyRequest(context=>this.http.delete<void>(this.url+'historial/'+encodeURIComponent(code)+'/',{withCredentials:true,headers:{'X-CSRFToken':context.csrf}}));}
  clearHistory(){return this.historyRequest(context=>this.http.delete<void>(this.url+'historial/',{withCredentials:true,headers:{'X-CSRFToken':context.csrf}})).pipe(tap(()=>{this.historyContext=undefined;}));}
  remember(result:Tracking){try{if(result.token){sessionStorage.setItem('solicitud-'+result.codigo,result.token);if(result.codigo_correlativo)sessionStorage.setItem('solicitud-'+result.codigo_correlativo,result.token);}}catch{/* Navigation also carries the credential when storage is unavailable. */}}
  credential(code:string){try{return sessionStorage.getItem('solicitud-'+code)||'';}catch{return '';}}
}
