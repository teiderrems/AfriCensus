import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Pipe({
  name: 'aclLocalizedText',
  pure: false,
})
export class AclLocalizedTextPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: string | Record<string, string> | null | undefined): string {
    if (!value) return '';
    const currentLang = this.i18n.language();

    if (typeof value === 'object') {
      if (value[currentLang]) return value[currentLang];
      if (value['fr']) return value['fr'];
      if (value['en']) return value['en'];
      const firstKey = Object.keys(value)[0];
      return firstKey ? value[firstKey] : '';
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('{')) {
        const closeBraceIdx = trimmed.indexOf('}');
        if (closeBraceIdx !== -1) {
          const jsonPart = trimmed.substring(0, closeBraceIdx + 1);
          const codeSuffix = trimmed.substring(closeBraceIdx + 1);
          try {
            const normalized = jsonPart.replace(/'/g, '"');
            const parsed = JSON.parse(normalized);
            if (typeof parsed === 'object' && parsed !== null) {
              const text = parsed[currentLang] || parsed['fr'] || parsed['en'] || Object.values(parsed)[0] || '';
              return String(text) + codeSuffix;
            }
          } catch {
            // Keep original string if parsing fails
          }
        }
      }
      
      let res = value;
      if (currentLang === 'en') {
        res = res
          .replace(/Région Capitale/g, 'Capital Region')
          .replace(/Province du Nord/g, 'North Province')
          .replace(/District du Sud/g, 'South District')
          .replace(/Zone Urbaine Est/g, 'East Urban Zone')
          .replace(/Zone Rurale Ouest/g, 'West Rural Zone')
          .replace(/Région Côtière Centrale/g, 'Central Coastal Region');
      } else {
        res = res
          .replace(/Capital Region/g, 'Région Capitale')
          .replace(/North Province/g, 'Province du Nord')
          .replace(/South District/g, 'District du Sud')
          .replace(/East Urban Zone/g, 'Zone Urbaine Est')
          .replace(/West Rural Zone/g, 'Zone Rurale Ouest')
          .replace(/Central Coastal Region/g, 'Région Côtière Centrale');
      }
      return res;
    }

    return String(value);
  }
}
