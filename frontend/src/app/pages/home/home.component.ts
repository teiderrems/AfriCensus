
import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';

import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { LanguageCode } from '@/app/core/i18n/translations';
import { HomeContent } from '@/app/core/models';
import { ThemeService } from '@/app/core/theme.service';

@Component({
  selector: 'acl-home-page',
  imports: [LucideAngularModule, FormsModule, RouterLink, UpperCasePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  readonly content = signal<HomeContent | null>(null);

  constructor(
    private readonly api: ApiService,
    readonly i18n: I18nService,
    readonly theme: ThemeService,
  ) {}

  ngOnInit(): void {
    this.loadContent();
  }

  loadContent(): void {
    this.api.homeContent(this.i18n.language()).subscribe({
      next: (content) => this.content.set(content),
      error: () => this.content.set(null),
    });
  }

  heroBackground(data: HomeContent): string {
    const image = data.hero.image_url ? `, url('${data.hero.image_url}')` : '';
    return `linear-gradient(110deg, rgba(0, 100, 145, .96), rgba(0, 100, 145, .76), rgba(0, 100, 145, .08))${image}`;
  }

  contactLines(contact: string): string[] {
    return contact.split('\n').filter(Boolean);
  }

  setLanguage(language: LanguageCode): void {
    this.i18n.setLanguage(language);
    this.loadContent();
  }

  toggleLanguage(): void {
    const next = this.i18n.language() === 'fr' ? 'en' : 'fr';
    this.setLanguage(next);
  }
}
