import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';
import { LoadingComponent } from './loading.component';

@Component({
  selector: 'app-action-loading',
  imports: [LoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './action-loading.component.css',
  template: `
    <div #indicator class="action-loading" popover="manual" [attr.aria-busy]="loading.active()">
      @if(loading.active()) {<app-loading [message]="loading.message()" />}
    </div>
  `,
})
export class ActionLoadingComponent {
  readonly loading = inject(LoadingService);
  private readonly indicator = viewChild<ElementRef<HTMLElement>>('indicator');
  constructor() {
    afterRenderEffect(() => {
      const active = this.loading.active();
      const element = this.indicator()?.nativeElement;
      if (!element) return;
      if (active && !element.matches(':popover-open')) element.showPopover();
      else if (!active && element.matches(':popover-open')) element.hidePopover();
    });
  }
}
