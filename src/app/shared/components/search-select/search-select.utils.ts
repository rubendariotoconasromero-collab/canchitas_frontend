import type { SelectOption } from '../select/select.component';

export function filterSelectOptions(options: SelectOption[], query: string): SelectOption[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return options.filter(option => terms.every(term => normalize(option.label).includes(term)));
}
