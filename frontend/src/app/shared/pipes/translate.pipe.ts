import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';

@Pipe({
  name: 'translate',
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(value: string | any, ...args: any[]): string {
    if (!value) return '';
    return this.i18n.t(value as TranslationKey, args[0]);
  }
}
