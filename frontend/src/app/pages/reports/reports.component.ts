import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, signal, computed, effect } from '@angular/core';

import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { PopulationSummary } from '@/app/core/models';
import { CardComponent } from '@/app/shared/card/card.component';
import { ChartComponent } from '@/app/shared/chart/chart.component';

@Component({
  selector: 'acl-reports-page',
  imports: [LucideAngularModule, CardComponent, ChartComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent implements OnInit {
  readonly summary = signal<PopulationSummary | null>(null);

  // Key metrics
  readonly totalPersons = computed(() => this.summary()?.totalPersons ?? 0);
  readonly totalHouseholds = computed(() => this.summary()?.totalHouseholds ?? 0);
  readonly avgMembers = computed(() => this.summary()?.averageMembersPerHousehold ?? 0);
  readonly vulnerable = computed(() => this.summary()?.vulnerablePersonsCount ?? 0);

  // Chart datasets
  readonly genderChartData = computed(() => {
    this.i18n.language();
    const data = this.summary()?.personsByGender ?? {};
    return {
      labels: Object.keys(data).map(k => this.i18n.t(`person.gender.${k}` as any) || k),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ['#0284c7', '#ec4899', '#94a3b8']
      }]
    };
  });

  readonly ageGroupChartData = computed(() => {
    this.i18n.language();
    const data = this.summary()?.personsByAgeGroup ?? {};
    return {
      labels: Object.keys(data).map(k => this.i18n.t(`ageGroup.${k}` as any) || k),
      datasets: [{
        label: this.i18n.t('reports.residents' as any) || 'Personnes',
        data: Object.values(data),
        backgroundColor: '#6366f1',
        borderRadius: 8
      }]
    };
  });

  readonly validationChartData = computed(() => {
    this.i18n.language();
    const data = this.summary()?.personsByValidationStatus ?? {};
    return {
      labels: Object.keys(data).map(k => this.i18n.t(`status.${k}` as any) || k),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ['#10b981', '#f59e0b', '#94a3b8', '#f97316', '#ef4444'] 
      }]
    };
  });

  readonly zoneChartData = computed(() => {
    this.i18n.language();
    const data = this.summary()?.personsByZone ?? {};
    return {
      labels: Object.keys(data).map(k => this.resolveLocalizedText(k)),
      datasets: [{
        label: this.i18n.t('reports.residents' as any) || 'Personnes',
        data: Object.values(data),
        backgroundColor: '#8b5cf6',
        borderRadius: 8
      }]
    };
  });

  readonly housingTypeChartData = computed(() => {
    this.i18n.language();
    const data = this.summary()?.householdsByHousingType ?? {};
    return {
      labels: Object.keys(data).map(k => this.i18n.t(`housingType.${k}` as any) || k),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ['#10b981', '#0284c7', '#f59e0b', '#f97316', '#64748b']
      }]
    };
  });

  constructor(private readonly api: ApiService, readonly i18n: I18nService) {
    effect(() => {
      const currentLang = this.i18n.language();
      this.api.populationSummary(currentLang).subscribe({
        next: (summary) => this.summary.set(summary),
        error: () => this.summary.set(null),
      });
    });
  }
  
  ngOnInit(): void {}

  private resolveLocalizedText(val: any): string {
    if (!val) return '';
    const currentLang = this.i18n.language();
    const strVal = String(val);
    const trimmed = strVal.trim();
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
          // fallback
        }
      }
    }

    let res = val;
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
}
