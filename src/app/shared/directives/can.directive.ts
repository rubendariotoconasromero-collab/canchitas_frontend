import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Directive({ selector: '[appCan]' })
export class CanDirective {
  readonly appCan = input.required<string>();
  readonly appCanGlobal = input(false);
  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);
  private visible = false;

  constructor() {
    effect(() => {
      const visible = this.auth.can(this.appCan(), this.appCanGlobal());
      if (visible === this.visible) return;
      this.visible = visible;
      if (visible) this.container.createEmbeddedView(this.template);
      else this.container.clear();
    });
  }
}
