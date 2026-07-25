import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'aclFormatValue',
  standalone: true
})
export class FormatValuePipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, ' ');
  }
}
