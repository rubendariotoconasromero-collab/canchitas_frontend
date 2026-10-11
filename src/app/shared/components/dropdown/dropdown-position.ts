import { DropdownAlign } from './dropdown.model';

export function dropdownPosition(
  trigger: { left: number; right: number; top: number; bottom: number },
  width: number, height: number, viewportWidth: number, viewportHeight: number,
  align: DropdownAlign,
) {
  const margin = 8;
  const gap = 4;
  const below = Math.max(0, viewportHeight - trigger.bottom - gap - margin);
  const above = Math.max(0, trigger.top - gap - margin);
  const upwards = height > below && above > below;
  const maxHeight = upwards ? above : below;
  const left = Math.max(margin, Math.min(
    align === 'end' ? trigger.right - width : trigger.left,
    viewportWidth - width - margin,
  ));
  const top = upwards ? trigger.top - gap - Math.min(height, maxHeight) : trigger.bottom + gap;
  return { left, top: Math.max(margin, top), maxHeight };
}
