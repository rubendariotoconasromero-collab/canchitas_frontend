import { Tracking } from './public.service';

export const publicStatusLabels:Record<string,string>={
  EN_REVISION:'En revision',PENDIENTE_PAGO:'Pendiente de pago',ACEPTADA:'Solicitud aceptada',
  CONFIRMADA:'Reserva confirmada',EN_CURSO:'En curso',FINALIZADA:'Finalizada',CANCELADA:'Cancelada',
  RECHAZADA:'Rechazada',VENCIDA:'Solicitud vencida',EXPIRADA:'Plazo de pago vencido',
};

export function publicStatus(row:Tracking & {estado_publico?:string}){
  const code=row.estado_publico || (row.estado_reserva==='PENDIENTE'?'PENDIENTE_PAGO':row.estado_reserva) ||
    (row.estado==='PENDIENTE'?'EN_REVISION':row.estado);
  const tone: 'warning'|'success'|'info'|'danger'|'neutral' = ['EN_REVISION','PENDIENTE_PAGO','ACEPTADA'].includes(code)?'warning':
    code==='CONFIRMADA'?'success':code==='EN_CURSO'?'info':['RECHAZADA','CANCELADA'].includes(code)?'danger':'neutral';
  return {label:publicStatusLabels[code]||code,tone};
}
