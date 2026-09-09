import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Title } from '@angular/platform-browser';
import { BrandingService } from './branding.service';
import { API_BASE_URL } from '../constants/api-endpoints';

describe('BrandingService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads the configured business and updates the browser title on each refresh', () => {
    const service = TestBed.inject(BrandingService);
    for (const name of ['Soccer Real Madrid', 'Soccer Real Madrid Central']) {
      service.load();
      TestBed.inject(HttpTestingController).expectOne(`${API_BASE_URL}/publico/marca/`)
        .flush({ nombre_comercial: name });
      expect(service.name()).toBe(name);
      expect(TestBed.inject(Title).getTitle()).toBe(name);
    }
  });

  it('keeps the fallback name when the backend is unavailable', () => {
    const service = TestBed.inject(BrandingService);
    service.load();
    TestBed.inject(HttpTestingController).expectOne(`${API_BASE_URL}/publico/marca/`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    expect(service.name()).toBe('Soccer Real Madrid');
  });
});
