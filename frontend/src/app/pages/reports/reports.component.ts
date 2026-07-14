import { LucideAngularModule } from 'lucide-angular';
import { JsonPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';

import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { PopulationSummary } from '@/app/core/models';

@Component({
  selector: 'acl-reports-page',
  imports: [LucideAngularModule, JsonPipe],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class ReportsComponent implements OnInit {
  readonly summary = signal<PopulationSummary | null>(null);
  constructor(private readonly api: ApiService, readonly i18n: I18nService) {}
  ngOnInit(): void {
    this.api.populationSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });
  }
}
