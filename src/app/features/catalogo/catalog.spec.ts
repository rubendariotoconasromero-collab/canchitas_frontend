import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CatalogListComponent } from './catalog-list.component';
import { CatalogService } from './catalog.service';
import { CATALOG, CatalogRow } from './catalog.config';
import { AuthService } from '../../core/services/auth.service';

describe('Catalog forms', () => {
  let service: jasmine.SpyObj<CatalogService>;
  let can: jasmine.Spy;
  beforeEach(() => {
    service = jasmine.createSpyObj('CatalogService',['list','save','deactivate','movePhoto','uploadPhotos']);
    service.list.and.returnValue(of([]));
    service.save.and.returnValue(of({id:1}));
    service.movePhoto.and.returnValue(of([]));
    service.uploadPhotos.and.returnValue(of([{id: 1}, {id: 2}]));
    can = jasmine.createSpy('can').and.returnValue(true);
    TestBed.configureTestingModule({providers:[provideRouter([]),
      {provide:CatalogService,useValue:service},{provide:AuthService,useValue:{can}}]});
  });
  function setup(key: string, fixed = {}) {
    const fixture = TestBed.createComponent(CatalogListComponent);
    fixture.componentRef.setInput('config',CATALOG[key]);
    fixture.componentRef.setInput('fixed',fixed);
    fixture.detectChanges();
    return fixture;
  }
  it('does not reload courts when user permissions are refreshed', () => {
    const allowed = signal(true);
    can.and.callFake(() => allowed());
    const fixture = setup('canchas');
    const calls = service.list.calls.count();
    allowed.set(false);
    fixture.detectChanges();
    expect(service.list.calls.count()).toBe(calls);
    fixture.componentInstance.load();
    expect(service.list.calls.count()).toBe(calls + 1);
  });
  it('renders every catalog without instantiating unopened form controls', () => {
    for (const key of Object.keys(CATALOG)) {
      const fixture = setup(key);
      expect(fixture.nativeElement.textContent).toContain(CATALOG[key].title);
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      fixture.destroy();
    }
  });
  it('starts with a configurable 60 minute minimum and rejects zero', () => {
    const fixture = setup('canchas');
    const component = fixture.componentInstance;
    component.edit();fixture.detectChanges();
    expect(component.form.contains('anticipacion_minutos')).toBeFalse();
    expect(component.form.get('duracion_minima_minutos')?.value).toBe(60);
    component.form.patchValue({sucursal:'1',codigo:'A',nombre:'Cancha',duracion_minima_minutos:0});
    component.save();expect(service.save).not.toHaveBeenCalled();
    component.form.patchValue({duracion_minima_minutos:90});component.save();
    expect((service.save.calls.mostRecent().args[1] as CatalogRow)['duracion_minima_minutos']).toBe(90);
    expect((service.save.calls.mostRecent().args[1] as CatalogRow)['anticipacion_minutos']).toBeUndefined();
  });
  it('organizes the court form into clear sections and paired rows', () => {
    const fixture = setup('canchas');
    fixture.componentInstance.edit();
    fixture.detectChanges();
    const form: HTMLElement = fixture.nativeElement.querySelector('[data-catalog="canchas"]');
    const sections = Array.from(form.querySelectorAll('.catalog-form-section')).map(element => element.textContent?.trim());
    expect(sections).toEqual(['Identificacion de la cancha', 'Superficie y dimensiones', 'Condiciones de alquiler', 'Caracteristicas', 'Estado y publicacion']);
    expect(form.querySelectorAll('.checkbox-option').length).toBe(4);
    const fields = CATALOG['canchas'].fields.map(field => field.key);
    expect(fields.indexOf('descripcion_publica')).toBe(fields.indexOf('nombre') + 1);
    expect(fields.indexOf('ancho_metros')).toBe(fields.indexOf('superficie') + 1);
    expect(fields.indexOf('largo_metros')).toBe(fields.indexOf('ancho_metros') + 1);
    expect(form.querySelector('input[step="0.01"]')).not.toBeNull();
    expect(form.querySelector('.court-area')?.textContent).toContain('Sin registrar');
  });
  it('shows a single business configuration and only updates its existing id', () => {
    const business = {id:1,nombre_comercial:'Soccer Real Madrid',moneda:'BOB',publicado:false};
    service.list.and.returnValue(of([business]));
    const fixture = setup('negocios');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Agregar');
    expect(fixture.nativeElement.textContent).toContain('Soccer Real Madrid');
    const component = fixture.componentInstance;
    component.edit();
    expect(component.opened()).toBeFalse();
    component.edit(business);
    component.form.patchValue({nombre_comercial:'Actualizado'});
    component.save();
    expect(service.save.calls.mostRecent().args[2]).toBe(1);
    expect(service.deactivate).not.toHaveBeenCalled();
  });
  it('updates the existing reservation configuration without creating a version', () => {
    const fixture = setup('politicas',{sucursal:7});
    const component = fixture.componentInstance;
    component.edit({id:10,version:2,sucursal:7,horas_limite_cancelacion:5});
    fixture.detectChanges();
    component.form.patchValue({horas_limite_cancelacion:8});component.save();
    const args = service.save.calls.mostRecent().args;
    expect(args[2]).toBe(10);
    expect((args[1] as any).sucursal).toBe(7);
    expect((args[1] as any).porcentaje_anticipo).toBeUndefined();
    expect((args[1] as any).pago_total_obligatorio).toBeUndefined();
    expect((args[1] as any).permite_reembolso).toBeUndefined();
    expect(component.form.contains('porcentaje_anticipo')).toBeFalse();
    expect(CATALOG['politicas'].columns.some(column => column.key === 'porcentaje_anticipo')).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-reservation-conditions')).toBeNull();
  });
  it('shows reservation rules and configured times in the row, without a top banner', () => {
    can.and.returnValue(false);
    service.list.and.returnValue(of([{id:10,sucursal:7,activo:true,horas_limite_cancelacion:8,minutos_retencion:20}]));
    const fixture = setup('politicas');
    const row: HTMLElement = fixture.nativeElement.querySelector('tbody tr');
    expect(row.textContent).toContain('100 % del importe');
    expect(row.textContent).toContain('Sin reembolso');
    expect(row.textContent).toContain('8');
    expect(row.textContent).toContain('20');
    expect(fixture.nativeElement.querySelector('app-reservation-conditions')).toBeNull();
    expect(fixture.componentInstance.display({minutos_retencion:null},'minutos_retencion')).toBe('Pendiente');
  });
  it('discards legacy advance values while keeping configurable cancellation and retention', () => {
    const fixture = setup('politicas',{sucursal:7});
    const component = fixture.componentInstance;
    component.edit({id:10,sucursal:7,porcentaje_anticipo:50,horas_limite_cancelacion:5,minutos_retencion:15});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal-body').textContent).toContain('Sin reembolso');
    expect(fixture.nativeElement.textContent).not.toContain('Anticipo (%)');
    component.form.patchValue({horas_limite_cancelacion:12});component.save();
    const payload = service.save.calls.mostRecent().args[1] as CatalogRow;
    expect(payload['porcentaje_anticipo']).toBeUndefined();
    expect(payload['horas_limite_cancelacion']).toBe(12);
    expect(payload['minutos_retencion']).toBe(15);
  });
  it('keeps the form open and displays API validation errors', () => {
    service.save.and.returnValue(throwError(() => ({error:{non_field_errors:['Horario superpuesto']}})));
    const fixture = setup('horarios',{cancha:3});
    const component = fixture.componentInstance;
    component.edit();component.form.patchValue({apertura:'18:00',cierre:'20:00'});component.save();fixture.detectChanges();
    expect(component.opened()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Horario superpuesto');
  });
  it('hides creation controls for read-only users', () => {
    can.and.returnValue(false);
    const fixture = setup('deportes');
    expect(fixture.nativeElement.textContent).not.toContain('Agregar');
  });
  it('sends multiple photo bytes as one multipart request with court ownership', () => {
    const fixture = setup('fotos',{cancha:3});
    const component = fixture.componentInstance;
    component.edit();
    expect(component.form.contains('orden')).toBeFalse();
    const photos = [new File(['image'], 'test.png',{type:'image/png'}), new File(['image'], 'otra.png',{type:'image/png'})];
    component.batchChanged(photos.map((file, index) => ({id:index, file, description:'Vista '+index, preview:'', previewFailed:false})));
    component.save();
    const payload = service.uploadPhotos.calls.mostRecent().args[0];
    expect(payload.get('cancha')).toBe('3');
    expect(payload.getAll('archivos').length).toBe(2);
    expect(payload.getAll('archivos')[0]).toBeInstanceOf(File);
    expect(JSON.parse(String(payload.get('fotografias')))).toEqual([{texto_alternativo:'Vista 0'}, {texto_alternativo:'Vista 1'}]);
    expect(payload.has('orden')).toBeFalse();
    expect(service.save).not.toHaveBeenCalled();
  });
  it('keeps editing an existing photograph as a single record', () => {
    const component = setup('fotos',{cancha:3}).componentInstance;
    component.edit({id:5, archivo:'https://example.test/foto.png', texto_alternativo:'Vista', publicada:true});
    component.form.patchValue({texto_alternativo:'Entrada'});component.save();
    expect(service.save.calls.mostRecent().args[2]).toBe(5);
    expect(service.uploadPhotos).not.toHaveBeenCalled();
  });
  it('moves photos through the dedicated endpoint and prevents boundary moves', () => {
    const rows = [{id:1,orden:0},{id:2,orden:1}];
    service.list.and.returnValue(of(rows));
    const component = setup('fotos',{cancha:3}).componentInstance;
    component.movePhoto(rows[0], 'subir');
    component.movePhoto(rows[1], 'bajar');
    expect(service.movePhoto).not.toHaveBeenCalled();
    component.movePhoto(rows[1], 'subir');
    expect(service.movePhoto).toHaveBeenCalledOnceWith(2, 'subir');
    expect(component.movingPhoto()).toBeFalse();
  });
  it('keeps photos visible and reports a failed reorder', () => {
    const rows = [{id:1,orden:0},{id:2,orden:1}];
    service.list.and.returnValue(of(rows));
    service.movePhoto.and.returnValue(throwError(() => ({error:{detail:'No permitido'}})));
    const component = setup('fotos',{cancha:3}).componentInstance;
    component.movePhoto(rows[1], 'subir');
    expect(component.rows()).toEqual(rows);
    expect(component.photoOrderError()).toContain('No permitido');
    expect(component.movingPhoto()).toBeFalse();
  });
});
