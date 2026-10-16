import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, input, untracked, viewChild } from '@angular/core';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({selector:'app-form-error',changeDetection:ChangeDetectionStrategy.OnPush,styleUrl:'./form-error.component.css',template:`
  @if(active() && message()) {
    <div #alert class="alert alert-danger form-error" role="alert" tabindex="-1" aria-atomic="true">
      <span class="material-symbols-outlined" aria-hidden="true">error</span>
      <span>{{message()}}</span>
    </div>
  }
`})
export class FormErrorComponent {
  readonly message=input('');
  readonly active=input(true);
  private readonly alert=viewChild<ElementRef<HTMLElement>>('alert');
  private readonly snackbar=inject(SnackbarService);
  private lastMessage='';

  constructor(){afterRenderEffect(()=>{
    const message=this.message();
    const alert=this.alert()?.nativeElement;
    if(!this.active() || !message){this.lastMessage='';return;}
    if(!alert || message===this.lastMessage)return;
    this.lastMessage=message;
    untracked(()=>this.snackbar.error(message));
    alert.focus({preventScroll:true});
    alert.scrollIntoView({block:'center',behavior:'instant'});
  });}
}
