import { FormsModule } from '@angular/forms';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { ListToolbarComponent } from '../../shared/components/list-toolbar/list-toolbar.component';
import { FilterContextComponent } from '../../shared/components/filter-context/filter-context.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { InputComponent } from '../../shared/components/input/input.component';
import { SelectComponent } from '../../shared/components/select/select.component';
import { CheckboxComponent } from '../../shared/components/checkbox/checkbox.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ListShellComponent } from '../../shared/components/list-shell/list-shell.component';
import { ButtonLinkComponent } from '../../shared/components/button/button-link.component';
import { SearchSelectComponent } from '../../shared/components/search-select/search-select.component';

export const RESERVAS_UI = [FormsModule, ListToolbarComponent, FilterContextComponent, BadgeComponent, ButtonComponent, ButtonLinkComponent, InputComponent, SelectComponent, SearchSelectComponent, CheckboxComponent, ModalComponent, PageHeaderComponent, ListShellComponent];
