import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FileInputComponent } from '../file-input/file-input.component';
import { InputComponent } from '../input/input.component';
import { ButtonComponent } from '../button/button.component';

export interface ImageDraft {
  id: number;
  file: File;
  preview: string;
  description: string;
  previewFailed: boolean;
}

@Component({
  selector: 'app-image-batch-picker',
  imports: [FormsModule, FileInputComponent, InputComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './image-batch-picker.css',
  template: `
    <app-file-input label="Fotografias (JPEG, PNG o WebP, hasta 5 MB por imagen)"
      accept="image/jpeg,image/png,image/webp" [multiple]="true" [disabled]="disabled()"
      [errorMessage]="selectionError()" (changed)="selectFiles($event)" />
    <div class="batch-count" role="status">{{images().length}} / {{maxFiles()}} fotografias</div>
    <div class="batch-grid">
      @for (image of images(); track image.id) {
        <section class="batch-image" [attr.aria-label]="image.file.name">
          <div class="batch-preview">
            @if (!image.previewFailed) {
              <img [src]="image.preview" [alt]="image.description || image.file.name" (error)="previewFailed(image.id)" />
            } @else {<p role="status">No se pudo mostrar la vista previa.</p>}
          </div>
          <div class="batch-details">
            <div class="batch-filename"><span [title]="image.file.name">{{image.file.name}}</span>
              <app-button icon="close" title="Quitar imagen" size="sm" variant="outline-danger"
                [disabled]="disabled()" (clicked)="remove(image.id)" />
            </div>
            <app-input label="Descripcion de la imagen" [required]="true" [ngModel]="image.description"
              [ngModelOptions]="{standalone: true}" [disabled]="disabled()"
              [errorMessage]="descriptionError(image.description)" (ngModelChange)="describe(image.id, $event)" />
          </div>
        </section>
      }
    </div>
  `,
})
export class ImageBatchPickerComponent {
  readonly disabled = input(false);
  readonly maxFiles = input(10);
  readonly changed = output<ImageDraft[]>();
  readonly images = signal<ImageDraft[]>([]);
  readonly selectionError = signal('');
  private nextId = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.images().forEach(image => URL.revokeObjectURL(image.preview));
    });
  }

  selectFiles(event: Event) {
    if (this.disabled()) return;
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files || []);
    input.value = '';
    if (!selected.length) return;
    const existing = this.images();
    const unique = selected.filter((file, index) =>
      ![...existing.map(image => image.file), ...selected.slice(0, index)].some(other =>
        other.name === file.name && other.size === file.size && other.lastModified === file.lastModified));
    if (existing.length + unique.length > this.maxFiles()) {
      this.selectionError.set(`Puedes agregar hasta ${this.maxFiles()} fotografias a la vez.`);
      return;
    }
    for (const file of unique) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) {
        this.selectionError.set(`${file.name}: usa JPEG, PNG o WebP, de hasta 5 MB y no vacio.`);
        return;
      }
    }
    this.selectionError.set('');
    this.images.set([...existing, ...unique.map(file => ({
      id: ++this.nextId, file, preview: URL.createObjectURL(file), previewFailed: false,
      description: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 200),
    }))]);
    this.changed.emit(this.images());
  }

  descriptionError(value: string) {
    return !value.trim() ? 'Escribe una descripcion.' : value.trim().length > 200 ? 'Usa hasta 200 caracteres.' : '';
  }

  describe(id: number, description: string) {
    if (this.disabled()) return;
    this.images.update(images => images.map(image => image.id === id ? {...image, description} : image));
    this.changed.emit(this.images());
  }

  previewFailed(id: number) {
    this.images.update(images => images.map(image => image.id === id ? {...image, previewFailed: true} : image));
  }

  remove(id: number) {
    if (this.disabled()) return;
    const removed = this.images().find(image => image.id === id);
    if (!removed) return;
    URL.revokeObjectURL(removed.preview);
    this.images.update(images => images.filter(image => image.id !== id));
    this.selectionError.set('');
    this.changed.emit(this.images());
  }
}
