import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, signal, computed } from '@angular/core';

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
    const data = this.summary()?.personsByGender ?? {};
    return {
      labels: Object.keys(data).map(k => this.i18n.t(`enum.gender.${k}` as any) || k),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ['#3b82f6', '#ec4899', '#64748b'] // blue, pink, slate
      }]
    };
  });

  readonly ageGroupChartData = computed(() => {
    const data = this.summary()?.personsByAgeGroup ?? {};
    return {
      labels: Object.keys(data).map(k => this.i18n.t(`ageGroup.${k}` as any) || k),
      datasets: [{
        label: this.i18n.t('reports.residents' as any) || 'Personnes',
        data: Object.values(data),
        backgroundColor: '#0ea5e9'
      }]
    };
  });

  readonly validationChartData = computed(() => {
    const data = this.summary()?.personsByValidationStatus ?? {};
    return {
      labels: Object.keys(data).map(k => this.i18n.t(`validation.status.${k}` as any) || k),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ['#22c55e', '#eab308', '#94a3b8', '#f97316', '#ef4444'] 
      }]
    };
  });

  readonly zoneChartData = computed(() => {
    const data = this.summary()?.personsByZone ?? {};
    return {
      labels: Object.keys(data),
      datasets: [{
        label: this.i18n.t('reports.residents' as any) || 'Personnes',
        data: Object.values(data),
        backgroundColor: '#8b5cf6'
      }]
    };
  });

  readonly housingTypeChartData = computed(() => {
    const data = this.summary()?.householdsByHousingType ?? {};
    return {
      labels: Object.keys(data).map(k => this.i18n.t(`housingType.${k}` as any) || k),
      datasets: [{
        data: Object.values(data),
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#64748b']
      }]
    };
  });

  constructor(private readonly api: ApiService, readonly i18n: I18nService) {}
  
  ngOnInit(): void {
    this.api.populationSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });
  }
}
