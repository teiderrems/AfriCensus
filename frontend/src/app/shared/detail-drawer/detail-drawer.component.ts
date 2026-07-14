import { DOCUMENT } from '@angular/common';
import { Component, EventEmitter, Inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';

export interface DetailDrawerItem {
  label: string;
  value: string | number | boolean | null | undefined;
}

import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'acl-detail-drawer',
  imports: [LucideAngularModule],
  templateUrl: './detail-drawer.component.html',
  styleUrl: './detail-drawer.component.css',
})
export class DetailDrawerComponent implements OnChanges, OnDestroy {
  private static openCount = 0;
  private static previousOverflow = '';

  @Input({ required: true }) open = false;
  @Input({ required: true }) title = 'Détails';
  @Input() subtitle = '';
  @Input() items: DetailDrawerItem[] = [];
  @Output() readonly closed = new EventEmitter<void>();
  private scrollLocked = false;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes) {
      this.syncBodyScrollLock();
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  display(value: DetailDrawerItem['value']): string {
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (value === null || value === undefined || value === '') return 'Non renseigné';
    return String(value);
  }

  private syncBodyScrollLock(): void {
    if (this.open) {
      this.lockBodyScroll();
      return;
    }
    this.unlockBodyScroll();
  }

  private lockBodyScroll(): void {
    if (this.scrollLocked) {
      return;
    }
    if (DetailDrawerComponent.openCount === 0) {
      DetailDrawerComponent.previousOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
    }
    DetailDrawerComponent.openCount += 1;
    this.scrollLocked = true;
  }

  private unlockBodyScroll(): void {
    if (!this.scrollLocked) {
      return;
    }
    DetailDrawerComponent.openCount = Math.max(0, DetailDrawerComponent.openCount - 1);
    if (DetailDrawerComponent.openCount === 0) {
      this.document.body.style.overflow = DetailDrawerComponent.previousOverflow;
    }
    this.scrollLocked = false;
  }
}
