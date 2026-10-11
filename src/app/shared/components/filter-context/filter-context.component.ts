import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector:'app-filter-context',
  changeDetection:ChangeDetectionStrategy.OnPush,
  template:`<span class="form-label">{{label()}}</span><p>{{value()}}</p>`,
  styles:[`:host{display:block;min-width:0}.form-label{display:block}p{display:flex;align-items:center;min-height:42px;margin:0;padding:8px 0;color:var(--text-700);font-size:14px;line-height:1.5;overflow-wrap:anywhere}`],
})
export class FilterContextComponent {
  readonly label=input.required<string>();
  readonly value=input.required<string>();
}
