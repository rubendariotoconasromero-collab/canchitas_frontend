import { Component, inject } from '@angular/core';
import { BrandingService } from './core/services/branding.service';
import { RouterOutlet } from '@angular/router';
import { SnackbarComponent } from './shared/components/snackbar/snackbar.component';
import { ActionLoadingComponent } from './shared/components/loading/action-loading.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SnackbarComponent, ActionLoadingComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor() {
    inject(BrandingService).load();
  }
}
