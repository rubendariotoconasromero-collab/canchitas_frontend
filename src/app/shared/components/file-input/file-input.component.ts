import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let nextId = 0;

@Component({
  selector: 'app-file-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="form-label" [for]="id">{{label()}}</label>
    <input class="form-control" type="file" [id]="id" [accept]="accept()" [disabled]="disabled()" [multiple]="multiple()"
      [class.is-invalid]="!!errorMessage()" [attr.aria-invalid]="!!errorMessage()"
      [attr.aria-describedby]="errorMessage() ? id + '-error' : null" (change)="changed.emit($event)" />
    @if(errorMessage()) {<small class="invalid-feedback d-block" [id]="id + '-error'" role="alert">{{errorMessage()}}</small>}
  `,
  styles: [':host { display: block; min-width: 0; }'],
})
export class FileInputComponent {
  readonly id = 'file-input-' + nextId++;
  readonly label = input('Archivo');
  readonly accept = input('');
  readonly disabled = input(false);
  readonly multiple = input(false);
  readonly errorMessage = input('');
  readonly changed = output<Event>();
}
