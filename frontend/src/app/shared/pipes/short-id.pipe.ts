import { Pipe, PipeTransform, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
@Pipe({
  name: 'aclShortId'
})
export class ShortIdPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    // Typically UUIDs are 36 chars. If it's long, take the first 8 characters
    if (value.length >= 8) {
      return `#${value.substring(0, 8).toUpperCase()}`;
    }
    return `#${value.toUpperCase()}`;
  }
}
