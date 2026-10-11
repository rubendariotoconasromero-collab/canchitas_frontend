import { Component, computed, effect, input, output, viewChild, ViewEncapsulation } from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import luxonPlugin from '@fullcalendar/luxon3';
import { Agenda } from './reservas.service';
import { localDate } from './agenda.utils';
import { calendarEvents, CalendarSelection, CalendarView, selectionDraft } from './reservation-calendar.utils';

const VIEWS: Record<CalendarView, string> = {day: 'timeGridDay', week: 'timeGridWeek', month: 'dayGridMonth'};

@Component({
  selector: 'app-reservation-calendar', imports: [FullCalendarModule],
  styleUrl: './reservation-calendar.component.css', encapsulation: ViewEncapsulation.None,
  template: `<div class="reservation-calendar">
    <div class="calendar-legend" aria-label="Estados del calendario">
      <span class="legend-pending">Pendiente de pago</span><span class="legend-confirmed">Confirmada</span>
      <span class="legend-progress">En curso</span><span class="legend-finished">Finalizada</span>
      <span class="legend-inactive">Cancelada / vencida</span><span class="legend-block">Bloqueo</span>
    </div>
    <div class="calendar-scroll"><full-calendar [options]="options()" [events]="events()">
      <ng-template #eventContent let-arg>
        <div class="calendar-event-copy"><strong>{{arg.timeText}}</strong><span>{{arg.event.title}}</span><small>{{arg.event.extendedProps.label}}</small></div>
      </ng-template>
    </full-calendar></div>
  </div>`,
})
export class ReservationCalendarComponent {
  readonly data = input<Agenda | null>(null);
  readonly date = input.required<string>();
  readonly view = input<CalendarView>('week');
  readonly zone = input('America/La_Paz');
  readonly state = input('');
  readonly canCreate = input(false);
  readonly disabled = input(false);
  readonly selected = output<CalendarSelection>();
  readonly dayChosen = output<string>();
  readonly eventChosen = output<{kind: string; id: number}>();
  readonly calendar = viewChild(FullCalendarComponent);
  readonly events = computed(() => calendarEvents(this.data(), this.state()));
  readonly options = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, luxonPlugin],
    initialDate: this.date(), initialView: VIEWS[this.view()], timeZone: this.zone(), locale: esLocale,
    headerToolbar: false, firstDay: 1, fixedWeekCount: true, allDaySlot: false,
    height: 'auto', nowIndicator: true, editable: false, selectable: this.canCreate() && !this.disabled(),
    selectMirror: true, dayMaxEvents: 3, eventMinHeight: 38, slotDuration: '00:30:00',
    slotLabelFormat: {hour: '2-digit', minute: '2-digit', hour12: false},
    eventTimeFormat: {hour: '2-digit', minute: '2-digit', hour12: false},
    scrollTime: '08:00:00', scrollTimeReset: false,
    dateClick: arg => {if (this.view() === 'month' && !this.disabled()) this.dayChosen.emit(arg.dateStr.slice(0, 10));},
    selectAllow: arg => {
      if (arg.allDay || this.disabled() || !this.canCreate() || arg.start.getTime() < Date.now()) return false;
      return arg.end.getTime() - arg.start.getTime() <= 24 * 60 * 60 * 1000;
    },
    select: arg => {
      const draft = selectionDraft(arg.startStr, arg.endStr);
      if (draft) this.selected.emit(draft);
      this.calendar()?.getApi().unselect();
    },
    eventClick: arg => {
      if (this.disabled()) return;
      const props = arg.event.extendedProps;
      this.eventChosen.emit({kind: props['kind'], id: props['id']});
    },
    eventDidMount: arg => {arg.el.title = `${arg.event.title} · ${arg.event.extendedProps['label'] || ''}`;},
  }));
  constructor() {
    effect(() => {
      const calendar = this.calendar(), view = VIEWS[this.view()], date = this.date(), zone = this.zone();
      if (!calendar) return;
      const api = calendar.getApi();
      if (api.view.type !== view) api.changeView(view, date);
      else if (localDate(api.getDate(), zone) !== date) api.gotoDate(date);
    });
  }
}
