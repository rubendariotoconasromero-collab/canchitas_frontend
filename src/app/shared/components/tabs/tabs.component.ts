import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChildren } from '@angular/core';

export interface TabItem<Key extends string = string> {
  key: Key;
  label: string;
  icon?: string;
  disabled?: boolean;
}

let nextId = 0;

@Component({
  selector: 'app-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tabs.component.css',
  template: `
    <nav class="app-tabs" role="tablist" [attr.aria-label]="label()" aria-orientation="horizontal" (focusout)="leave($event)">
      @for (item of items(); track item.key) {
        <button #tabButton type="button" role="tab" class="app-tabs-button"
          [id]="tabId(item.key)" [attr.aria-controls]="panelId"
          [attr.aria-selected]="selected() === item.key" [class.active]="selected() === item.key"
          [disabled]="disabled() || !!item.disabled" [attr.tabindex]="tabIndex(item.key)"
          (focus)="focused.set(item.key)" (click)="choose(item.key)" (keydown)="keyDown($event, item.key)">
          @if (item.icon) {<span class="material-symbols-outlined" aria-hidden="true">{{item.icon}}</span>}
          <span>{{item.label}}</span>
        </button>
      }
    </nav>
    <div class="app-tabs-panel" role="tabpanel" [id]="panelId" [hidden]="!activeItem()"
      [attr.aria-labelledby]="activeItem() ? tabId(selected()) : null" tabindex="0">
      <ng-content />
    </div>
  `,
})
export class TabsComponent<Key extends string = string> {
  readonly items = input.required<readonly TabItem<Key>[]>();
  readonly selected = input.required<Key>();
  readonly label = input('Secciones');
  readonly disabled = input(false);
  readonly selectedChange = output<Key>();
  readonly focused = signal<Key | null>(null);
  readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');
  private readonly id = `app-tabs-${++nextId}`;
  readonly panelId = `${this.id}-panel`;
  readonly activeItem = computed(() => this.items().find(item => item.key === this.selected()));

  tabId(key: Key): string { return `${this.id}-tab-${key}`; }

  tabIndex(key: Key): number {
    if (this.disabled()) return -1;
    const enabled = this.items().filter(item => !item.disabled);
    const target = enabled.find(item => item.key === this.focused())
      || enabled.find(item => item.key === this.selected()) || enabled[0];
    return target?.key === key ? 0 : -1;
  }

  choose(key: Key): void {
    const item = this.items().find(item => item.key === key);
    if (this.disabled() || !item || item.disabled || key === this.selected()) return;
    this.focused.set(key);
    this.selectedChange.emit(key);
  }

  // Moving focus does not reload a screen. Enter/Space activate the focused button.
  keyDown(event: KeyboardEvent, key: Key): void {
    if (this.disabled() || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const enabled = this.items().filter(item => !item.disabled);
    const index = enabled.findIndex(item => item.key === key);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length;
    const target = enabled[next];
    this.focused.set(target.key);
    this.buttons()[this.items().findIndex(item => item.key === target.key)]?.nativeElement.focus();
  }

  leave(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) this.focused.set(null);
  }
}
