import type { ValidatorFn } from '@angular/forms';

const numberFormat = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const empty = (value: unknown) => value === null || value === undefined || value === '';

export function formatArea(value: unknown): string {
  return empty(value) ? 'Sin registrar' : `${numberFormat.format(Number(value))} m\u00b2`;
}

export function formatDimensions(width: unknown, length: unknown): string {
  return empty(width) || empty(length) ? 'Sin registrar'
    : `${numberFormat.format(Number(width))} \u00d7 ${numberFormat.format(Number(length))} m`;
}

export const dimensionsValidator: ValidatorFn = control => {
  const width = control.get('ancho_metros')?.value;
  const length = control.get('largo_metros')?.value;
  if (empty(width) && empty(length)) return null;
  if (empty(width) || empty(length)) return { dimensions: 'Registra ancho y largo juntos, o deja ambos vacios.' };
  for (const value of [width, length]) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0 || number > 99999.99) {
      return { dimensions: 'Las medidas deben ser mayores que cero y no superar 99.999,99 m.' };
    }
    if (Math.abs(number * 100 - Math.round(number * 100)) > 0.000001) {
      return { dimensions: 'Usa como maximo dos decimales para las medidas.' };
    }
  }
  return null;
};
