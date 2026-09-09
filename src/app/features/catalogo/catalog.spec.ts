import { TestBed } from '@angular/core/testing';
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
    service = jasmine.createSpyObj('CatalogService',['list','save','deactivate']);
    service.list.and.returnValue(of([]));
    service.save.and.returnValue(of({id:1}));
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
    expect(sections).toEqual(['Identificacion de la cancha', 'Condiciones de alquiler', 'Caracteristicas y estado']);
    expect(form.querySelectorAll('.checkbox-option').length).toBe(4);
    const fields = CATALOG['canchas'].fields.map(field => field.key);
    expect(fields.indexOf('superficie')).toBe(fields.indexOf('nombre') + 1);
    expect(fields.indexOf('descripcion_publica')).toBe(fields.indexOf('superficie') + 1);
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
    expect((args[1] as any).porcentaje_anticipo).toBeNull();
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
  it('sends photo bytes as multipart with court ownership', () => {
    const fixture = setup('fotos',{cancha:3});
    const component = fixture.componentInstance;
    component.edit();
    component.fileChanged({target:{files:[new File(['image'], 'test.png',{type:'image/png'})]}} as unknown as Event);
    component.form.patchValue({texto_alternativo:'Vista frontal'});component.save();
    const payload = service.save.calls.mostRecent().args[1] as FormData;
    expect(payload.get('cancha')).toBe('3');
    expect(payload.get('archivo')).toBeInstanceOf(File);
  });
});
