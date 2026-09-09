import { Component, inject } from '@angular/core';
import { BrandingService } from './core/services/branding.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor() {
    inject(BrandingService).load();
  }
}
