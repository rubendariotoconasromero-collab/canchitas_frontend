export type DropdownAlign = 'start' | 'end';

export interface DropdownItemConfig {
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  action?: () => void;
  divided?: boolean;
}
