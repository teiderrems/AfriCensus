import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'acl-page-size-select',
  imports: [LucideAngularModule, FormsModule, SelectComponent],
  templateUrl: './page-size-select.component.html',
  styleUrl: './page-size-select.component.css',
})
export class PageSizeSelectComponent {
  i18n = inject(I18nService);
  @Input() controlId = 'pageSize';
  @Input() value = 10;
  @Input() options: number[] = [5, 10, 20, 50];
  @Output() valueChange = new EventEmitter<number>();

  protected readonly Number = Number;
}
