import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CatalogListComponent } from './catalog-list.component';
import { CATALOG } from './catalog.config';

@Component({selector:'app-catalog-page',imports:[CatalogListComponent],
  template:`<div class="main-content"><app-catalog-list [config]="config" /></div>`})
export class CatalogPageComponent {
  readonly config = CATALOG[inject(ActivatedRoute).snapshot.data['catalog']];
}
