import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { I18nService } from '../../core/i18n/i18n.service';

@Injectable({ providedIn: 'root' })
@Pipe({
  name: 'aclLocalizedDate',
  pure: false
})
export class LocalizedDatePipe implements PipeTransform {
  constructor(private i18n: I18nService) {}

  transform(value: string | Date | number | null | undefined, formatString: string = 'PPpp'): string {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return String(value);

      const locale = this.i18n.language() === 'fr' ? fr : enUS;
      return format(date, formatString, { locale });
    } catch (e) {
      return String(value);
    }
  }
}
