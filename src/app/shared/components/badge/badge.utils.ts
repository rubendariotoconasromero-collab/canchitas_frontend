export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export interface BadgeAppearance { label: string; tone: BadgeTone; icon: string; }
const STATES: Record<string, BadgeAppearance> = {
  PENDIENTE: {label:'Pendiente de pago',tone:'warning',icon:'schedule'},
  CONFIRMADA: {label:'Confirmada',tone:'success',icon:'check_circle'},
  EN_CURSO: {label:'En curso',tone:'info',icon:'sports_soccer'},
  FINALIZADA: {label:'Finalizada',tone:'neutral',icon:'check_circle'},
  CANCELADA: {label:'Cancelada',tone:'danger',icon:'cancel'},
  EXPIRADA: {label:'Retencion vencida',tone:'neutral',icon:'schedule'},
  ABIERTO: {label:'Abierto',tone:'success',icon:'check_circle'},
  CERRADO: {label:'Cerrado',tone:'neutral',icon:'lock'},
};

export function badgeAppearance(options: {
  active: boolean; activeLabel: string; inactiveLabel: string;
  state: string | null; label: string | null; tone: BadgeTone | null; icon: string | null;
}): BadgeAppearance {
  const fallback: BadgeAppearance = {label:options.active ? options.activeLabel : options.inactiveLabel,
    tone:options.active ? 'success' : 'neutral',icon:options.active ? 'check_circle' : 'cancel'};
  const preset = options.state ? (Object.hasOwn(STATES, options.state) ? STATES[options.state] : {label:options.state,tone:'neutral' as BadgeTone,icon:''}) : fallback;
  return {label:options.label ?? preset.label,tone:options.tone ?? preset.tone,icon:options.icon ?? preset.icon};
}
