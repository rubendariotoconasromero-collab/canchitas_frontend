import { CatalogConfig, Field } from '../catalogo/catalog.config';
const published:Field={key:'publicada',label:'Publicada',type:'checkbox',initial:false};
const image:Field={key:'archivo',label:'Imagen (JPEG, PNG o WebP, hasta 5 MB)',type:'file'};
const alt:Field={key:'texto_alternativo',label:'Descripcion de la imagen',wide:true};
const choices=(values:string[])=>values.map(value=>({value,label:value.charAt(0)+value.slice(1).toLowerCase()}));
const base={permission:'contenido_web',global:true,state:'publicada'};
export const WEB_CONTENT:Record<string,CatalogConfig>={
  presentacion:{...base,endpoint:'configuracion-web',title:'Presentacion y ajustes',icon:'tune',singleton:true,singletonView:'fields',columns:[],fields:[
    {key:'lema',label:'Lema'}, {key:'descripcion_intro',label:'Introduccion',type:'textarea'},
    {key:'horario_atencion',label:'Horario de atencion comercial',wide:true},
    {key:'seo_titulo',label:'Titulo para buscadores',sectionBefore:'Buscadores'},
    {key:'seo_descripcion',label:'Descripcion para buscadores',type:'textarea'},
    {key:'mostrar_deportes',label:'Mostrar deportes',type:'checkbox',initial:true,sectionBefore:'Secciones visibles'},
    {key:'mostrar_canchas',label:'Mostrar canchas',type:'checkbox',initial:true},
    {key:'mostrar_contacto',label:'Mostrar contacto',type:'checkbox',initial:true},published]},
  slider:{...base,endpoint:'slides-web',title:'Slider de portada',icon:'panorama',ordered:true,
    columns:[{key:'archivo',label:'Imagen'},{key:'titulo',label:'Titulo'},{key:'destino',label:'Destino'}],fields:[
      {key:'titulo',label:'Titulo',required:true},{key:'descripcion',label:'Descripcion',type:'textarea'},image,alt,
      {key:'texto_boton',label:'Texto del boton',initial:'Ver canchas'},
      {key:'destino',label:'Destino',type:'select',required:true,initial:'CANCHAS',options:choices(['CANCHAS','CONTACTO','SEGUIMIENTO'])},published]},
  secciones:{...base,endpoint:'secciones-web',title:'Secciones institucionales',icon:'view_agenda',ordered:true,
    columns:[{key:'tipo',label:'Seccion'},{key:'titulo',label:'Titulo'},{key:'archivo',label:'Imagen'}],fields:[
      {key:'tipo',label:'Seccion',type:'select',required:true,options:choices(['NOSOTROS','INSTALACIONES','SERVICIOS'])},
      {key:'titulo',label:'Titulo',required:true},{key:'contenido',label:'Contenido',type:'textarea'},image,alt,published]},
  contactos:{...base,endpoint:'contactos-web',title:'Contactos adicionales',icon:'contact_phone',ordered:true,
    columns:[{key:'etiqueta',label:'Contacto'},{key:'tipo',label:'Tipo'},{key:'valor',label:'Valor'}],fields:[
      {key:'tipo',label:'Tipo',type:'select',required:true,initial:'TELEFONO',options:choices(['TELEFONO','WHATSAPP','CORREO'])},
      {key:'etiqueta',label:'Etiqueta',required:true},{key:'valor',label:'Telefono con codigo de pais o correo',required:true},published]},
  redes:{...base,endpoint:'redes-web',title:'Redes sociales',icon:'share',ordered:true,
    columns:[{key:'plataforma',label:'Red social'},{key:'url',label:'Enlace'}],fields:[
      {key:'plataforma',label:'Red social',type:'select',required:true,options:choices(['FACEBOOK','INSTAGRAM','TIKTOK','YOUTUBE','X'])},
      {key:'url',label:'Enlace HTTPS del perfil',type:'url',required:true,wide:true},published]},
};
