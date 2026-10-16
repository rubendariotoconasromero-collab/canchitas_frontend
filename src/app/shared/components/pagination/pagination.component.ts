import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';
import { SelectComponent } from '../select/select.component';

@Component({
  selector: 'app-pagination', changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonComponent, SelectComponent],
  template: `<nav class="app-pagination" aria-label="Paginacion">
    <span aria-live="polite">{{count()}} registros · Pagina {{page()}} de {{pages()}}</span>
    <app-select label="Filas" [options]="sizes" [ngModel]="pageSize()" [disabled]="busy()" (ngModelChange)="chooseSize($event)" />
    <app-button variant="outline-secondary" icon="chevron_left" title="Pagina anterior" [disabled]="busy() || page()<=1" (clicked)="pageChanged.emit(page()-1)" />
    <app-button variant="outline-secondary" icon="chevron_right" title="Pagina siguiente" [disabled]="busy() || page()>=pages()" (clicked)="pageChanged.emit(page()+1)" />
  </nav>`,
  styles: [`.app-pagination{display:flex;align-items:end;justify-content:flex-end;gap:12px;flex-wrap:wrap;padding:16px 0}.app-pagination>span{margin-right:auto;align-self:center;font-size:13px}.app-pagination app-select{display:block;width:90px}.app-pagination .form-label{font-size:12px}`],
})
export class PaginationComponent {
  readonly count=input(0); readonly page=input(1); readonly pageSize=input(25); readonly busy=input(false);
  readonly pageChanged=output<number>(); readonly sizeChanged=output<number>();
  readonly pages=computed(()=>Math.max(1,Math.ceil(this.count()/this.pageSize())));
  readonly sizes=[{value:'25',label:'25'},{value:'50',label:'50'},{value:'100',label:'100'}];
  chooseSize(value:string){const size=Number(value);if([25,50,100].includes(size))this.sizeChanged.emit(size);}
}
