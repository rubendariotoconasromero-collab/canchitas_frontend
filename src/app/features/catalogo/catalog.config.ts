export type CatalogRow = Record<string, any>;
export interface Field {
  key: string; label: string; type?: 'text' | 'number' | 'date' | 'time' | 'email' | 'url' | 'textarea' | 'select' | 'checkbox' | 'file';
  required?: boolean; initial?: any; min?: number; max?: number;
  options?: { value: string; label: string }[]; lookup?: string; labelKey?: string; nullable?: boolean;
}
export interface CatalogConfig {
  endpoint: string; title: string; icon: string; permission: string; global?: boolean;
  fields: Field[]; columns: { key: string; label: string }[]; state?: string; versioned?: boolean; singleton?: boolean;
}
const days = ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'].map((label, i) => ({label, value: String(i + 1)}));
const branch: Field = {key:'sucursal',label:'Sucursal',type:'select',lookup:'sucursales',required:true};
const active: Field = {key:'activo',label:'Activo',type:'checkbox',initial:true};
const schedule: Field[] = [
  {key:'dia_semana',label:'Dia',type:'select',options:days,required:true,initial:1},
  {key:'cruza_medianoche',label:'Termina al dia siguiente',type:'checkbox',initial:false},
];
export const CATALOG: Record<string, CatalogConfig> = {
  negocios: {endpoint:'negocios',title:'Configuracion del negocio',icon:'storefront',permission:'negocio',global:true,state:'publicado',singleton:true,
    columns:[{key:'nombre_comercial',label:'Nombre'},{key:'telefono',label:'Telefono'},{key:'moneda',label:'Moneda'}], fields:[
      {key:'nombre_comercial',label:'Nombre comercial',required:true},
      {key:'descripcion_publica',label:'Descripcion publica',type:'textarea'},
      {key:'telefono',label:'Telefono'},{key:'correo_publico',label:'Correo publico',type:'email'},
      {key:'logo_url',label:'URL del logo',type:'url'},{key:'portada_url',label:'URL de portada',type:'url'},
      {key:'sitio_web',label:'Sitio web',type:'url'},
      {key:'moneda',label:'Moneda',type:'select',initial:'BOB',options:[{value:'BOB',label:'Bolivianos (Bs)'}]},
      {key:'publicado',label:'Publicado',type:'checkbox',initial:false}]},
  sucursales: {endpoint:'sucursales',title:'Sucursales',icon:'location_on',permission:'sucursales',global:true,state:'estado',
    columns:[{key:'nombre',label:'Nombre'},{key:'direccion',label:'Direccion'},{key:'telefono',label:'Telefono'}], fields:[
      {key:'negocio',label:'Negocio',type:'select',lookup:'negocios',labelKey:'nombre_comercial',required:true},
      {key:'nombre',label:'Nombre',required:true},{key:'slug_publico',label:'Identificador publico',required:true},
      {key:'direccion',label:'Direccion'},{key:'telefono',label:'Telefono'},
      {key:'zona_horaria',label:'Zona horaria',initial:'America/La_Paz',required:true},
      {key:'latitud',label:'Latitud',type:'number',min:-90,max:90,nullable:true},
      {key:'longitud',label:'Longitud',type:'number',min:-180,max:180,nullable:true},
      {key:'estado',label:'Activa',type:'checkbox',initial:true}]},
  deportes: {endpoint:'deportes',title:'Deportes',icon:'sports',permission:'deportes',global:true,state:'activo',
    columns:[{key:'nombre',label:'Nombre'}],fields:[{key:'nombre',label:'Nombre',required:true},active]},
  canchas: {endpoint:'canchas',title:'Canchas',icon:'sports_soccer',permission:'canchas',state:'activa',
    columns:[{key:'nombre',label:'Cancha'},{key:'sucursal_nombre',label:'Sucursal'},{key:'superficie',label:'Superficie'},
      {key:'duracion_minima_minutos',label:'Minimo (min)'},{key:'publicada',label:'Publicada'}],fields:[
      branch,{key:'codigo',label:'Codigo',required:true},{key:'nombre',label:'Nombre',required:true},
      {key:'descripcion_publica',label:'Descripcion publica',type:'textarea'},
      {key:'superficie',label:'Superficie'},{key:'capacidad_personas',label:'Capacidad',type:'number',initial:10,min:1,required:true},
      {key:'duracion_minima_minutos',label:'Duracion minima (minutos)',type:'number',initial:60,min:1,required:true},
      {key:'anticipacion_minutos',label:'Anticipacion web (minutos)',type:'number',initial:0,min:0,required:true},
      {key:'techada',label:'Techada',type:'checkbox',initial:false},
      {key:'iluminacion',label:'Con iluminacion',type:'checkbox',initial:false},
      {key:'activa',label:'Activa',type:'checkbox',initial:true},
      {key:'publicada',label:'Publicada',type:'checkbox',initial:false}]},
  'cancha-deportes': {endpoint:'cancha-deportes',title:'Deportes de la cancha',icon:'sports',permission:'canchas',state:'activo',
    columns:[{key:'deporte_nombre',label:'Deporte'}],fields:[
      {key:'deporte',label:'Deporte',type:'select',lookup:'deportes',required:true},active]},
  horarios: {endpoint:'horarios',title:'Horarios',icon:'schedule',permission:'horarios',state:'activo',
    columns:[{key:'dia_semana',label:'Dia'},{key:'apertura',label:'Apertura'},{key:'cierre',label:'Cierre'},{key:'cruza_medianoche',label:'Dia siguiente'}],
    fields:[...schedule,{key:'apertura',label:'Apertura',type:'time',required:true},
      {key:'cierre',label:'Cierre',type:'time',required:true},active]},
  tarifas: {endpoint:'tarifas',title:'Tarifas',icon:'payments',permission:'tarifas',state:'activa',
    columns:[{key:'nombre',label:'Tarifa'},{key:'dia_semana',label:'Dia'},{key:'hora_desde',label:'Desde'},
      {key:'hora_hasta',label:'Hasta'},{key:'precio_hora',label:'Bs / hora'},{key:'vigente_desde',label:'Vigencia desde'},{key:'vigente_hasta',label:'Hasta'}], fields:[
      {key:'cancha_deporte',label:'Deporte de la cancha',type:'select',lookup:'cancha-deportes',labelKey:'deporte_nombre',required:true},
      {key:'nombre',label:'Nombre',required:true},...schedule,
      {key:'hora_desde',label:'Desde',type:'time',required:true},{key:'hora_hasta',label:'Hasta',type:'time',required:true},
      {key:'vigente_desde',label:'Vigente desde',type:'date',required:true},
      {key:'vigente_hasta',label:'Vigente hasta',type:'date',nullable:true},
      {key:'precio_hora',label:'Precio por hora (Bs)',type:'number',min:0.01,required:true},
      {key:'activa',label:'Activa',type:'checkbox',initial:true}]},
  fotos: {endpoint:'fotos',title:'Fotografias',icon:'photo_library',permission:'canchas',state:'publicada',
    columns:[{key:'texto_alternativo',label:'Descripcion'},{key:'orden',label:'Orden'}],fields:[
      {key:'archivo',label:'Imagen (JPEG, PNG o WebP, hasta 5 MB)',type:'file',required:true},
      {key:'texto_alternativo',label:'Descripcion de la imagen',required:true},
      {key:'orden',label:'Orden',type:'number',min:0,initial:0},
      {key:'publicada',label:'Publicada',type:'checkbox',initial:true}]},
  politicas: {endpoint:'politicas',title:'Configuracion de reservas',icon:'policy',permission:'politicas',state:'activa',
    columns:[{key:'sucursal',label:'Sucursal'},
      {key:'horas_limite_cancelacion',label:'Cancelacion (horas)'},{key:'porcentaje_anticipo',label:'Anticipo (%)'},
      {key:'condiciones',label:'Condiciones'}], fields:[branch,
      {key:'horas_limite_cancelacion',label:'Anticipacion para cancelar (horas)',type:'number',initial:5,min:0,required:true},
      {key:'porcentaje_anticipo',label:'Anticipo (%)',type:'number',nullable:true,min:0.01,max:100},
      {key:'minutos_retencion',label:'Retencion tecnica (minutos)',type:'number',nullable:true,min:1},
      {key:'condiciones',label:'Condiciones',type:'textarea'}]},
};
