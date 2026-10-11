import {
  ChangeDetectionStrategy,
  afterRenderEffect,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  ViewEncapsulation,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DropdownAlign, DropdownItemConfig } from './dropdown.model';
import { dropdownPosition } from './dropdown-position';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  styleUrl: './dropdown.component.css',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-dropdown" [class.is-open]="isOpen()">
      <button
        #trigger
        type="button"
        class="dropdown-trigger"
        [class.is-open]="isOpen()"
        [disabled]="disabled()"
        [title]="title()"
        [attr.aria-label]="title()"
        aria-haspopup="menu"
        [attr.aria-expanded]="isOpen()"
        (click)="toggle($event)"
      >
        @if (triggerIcon() === 'more_vert') {
          <svg class="dropdown-dots-svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="2.2" />
            <circle cx="12" cy="12" r="2.2" />
            <circle cx="12" cy="19" r="2.2" />
          </svg>
        } @else if (triggerIcon() === 'more_horiz') {
          <svg class="dropdown-dots-svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2.2" />
            <circle cx="12" cy="12" r="2.2" />
            <circle cx="19" cy="12" r="2.2" />
          </svg>
        } @else if (triggerIcon()) {
          <span class="material-symbols-outlined" aria-hidden="true">{{ triggerIcon() }}</span>
        }
        <span class="dropdown-trigger-label">{{ label() }}</span>
        <span class="dropdown-chevron" aria-hidden="true"></span>
      </button>

      @if (isOpen()) {
        <div
          #menu
          class="dropdown-menu"
          popover="auto"
          (toggle)="onPopoverToggle($event)"
          [class.dropdown-align-end]="align() === 'end'"
          [class.dropdown-align-start]="align() === 'start'"
          role="menu"
        >
          @if (items().length > 0) {
            @for (item of items(); track item.label) {
              @if (item.divided) {
                <div class="dropdown-divider" role="separator"></div>
              }
              <button
                type="button"
                class="dropdown-item-btn"
                [class.is-danger]="item.danger"
                [disabled]="item.disabled"
                role="menuitem"
                (click)="onItemClick(item, $event)"
              >
                @if (item.icon) {
                  <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
                }
                <span>{{ item.label }}</span>
              </button>
            }
          }
          <ng-content />
        </div>
      }
    </div>
  `,
})
export class DropdownComponent {
  private readonly elementRef = inject(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild<ElementRef<HTMLDivElement>>('menu');

  align = input<DropdownAlign>('end');
  title = input<string>('Acciones');
  label = input<string>('Acciones');
  triggerIcon = input<string>('');
  disabled = input<boolean>(false);
  items = input<DropdownItemConfig[]>([]);

  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  readonly isOpen = signal(false);

  constructor() {
    afterRenderEffect(() => {
      const menu = this.menu()?.nativeElement;
      if (this.isOpen() && menu) {
        if (!menu.matches(':popover-open')) menu.showPopover();
        this.positionMenu();
      }
    });
    // Scroll events do not bubble; capture them to dismiss menus in scrolling lists.
    const onScroll = (event: Event) => {
      if (!this.menu()?.nativeElement.contains(event.target as Node)) this.close();
    };
    const document = this.elementRef.nativeElement.ownerDocument as Document;
    document.addEventListener('scroll', onScroll, true);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('scroll', onScroll, true));
  }

  @HostListener('window:resize')
  positionMenu(): void {
    const trigger = this.trigger()?.nativeElement;
    const menu = this.menu()?.nativeElement;
    if (!this.isOpen() || !trigger || !menu) return;
    const viewport = trigger.ownerDocument.documentElement;
    const position = dropdownPosition(trigger.getBoundingClientRect(), menu.offsetWidth,
      menu.scrollHeight, viewport.clientWidth, viewport.clientHeight, this.align());
    menu.style.left = `${position.left}px`;
    menu.style.top = `${position.top}px`;
    menu.style.maxHeight = `${position.maxHeight}px`;
  }

  onPopoverToggle(event: Event): void {
    if ((event as ToggleEvent).newState === 'closed') this.close();
  }

  toggle(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.disabled()) return;
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.disabled() || this.isOpen()) return;
    this.isOpen.set(true);
    this.opened.emit();
  }

  close(): void {
    if (!this.isOpen()) return;
    const menu = this.menu()?.nativeElement;
    if (menu?.matches(':popover-open')) menu.hidePopover();
    this.isOpen.set(false);
    this.closed.emit();
  }

  onItemClick(item: DropdownItemConfig, event: MouseEvent): void {
    event.stopPropagation();
    if (item.disabled) return;
    item.action?.();
    this.close();
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.isOpen()) return;
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }
}
