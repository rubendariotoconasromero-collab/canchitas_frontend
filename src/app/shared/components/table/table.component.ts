import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

@Component({
  selector: 'app-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './table.component.css',
  template: `
    <table class="table app-data-table" [class.table-fixed]="fixed()"
      [style.min-width]="minWidth()" [attr.aria-label]="label()">
      <ng-content select="thead" />
      <ng-content select="tbody" />
      <ng-content select="tfoot" />
    </table>
  `,
})
export class TableComponent {
  readonly label=input.required<string>();
  readonly minWidth=input('640px');
  readonly fixed=input(false);
}
