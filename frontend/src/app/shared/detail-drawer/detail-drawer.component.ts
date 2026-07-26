import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Inject, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';

export interface DetailDrawerItem {
  label: string;
  value: string | number | boolean | Record<string, string> | null | undefined;
}

import { LucideAngularModule } from 'lucide-angular';
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';
import { I18nService } from '@/app/core/i18n/i18n.service';

@Component({
  selector: 'acl-detail-drawer',
  imports: [LucideAngularModule, ButtonComponent, AclTooltipDirective],
  templateUrl: './detail-drawer.component.html',
  styleUrl: './detail-drawer.component.css',
})
export class DetailDrawerComponent implements OnChanges, OnDestroy {
  readonly i18n = inject(I18nService);
  private static openCount = 0;
  private static previousOverflow = '';

  @Input({ required: true }) open = false;
  @Input({ required: true }) title = 'Détails';
  @Input() subtitle = '';
  @Input() items: DetailDrawerItem[] = [];
  @Output() readonly closed = new EventEmitter<void>();
  private scrollLocked = false;
  private previousFocus: HTMLElement | null = null;
  private focusTimeout: any;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly elementRef: ElementRef<HTMLElement>
  ) {}

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (this.open) {
      event.preventDefault();
      this.closed.emit();
    }
  }
  
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.open || event.key !== 'Tab') return;
    const focusables = this.getFocusableElements();
    if (focusables.length === 0) return;
    
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes) {
      this.syncBodyScrollLock();
      
      if (this.open) {
        this.previousFocus = this.document.activeElement as HTMLElement;
        this.focusTimeout = setTimeout(() => {
          const focusables = this.getFocusableElements();
          if (focusables.length > 0) {
            focusables[0].focus();
          }
        }, 50);
      } else {
        clearTimeout(this.focusTimeout);
        if (this.previousFocus) {
          this.previousFocus.focus();
          this.previousFocus = null;
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
    clearTimeout(this.focusTimeout);
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
  }

  display(value: DetailDrawerItem['value']): string {
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (value === null || value === undefined || value === '') return 'Non renseigné';
    if (typeof value === 'object') {
      const currentLang = this.i18n.language();
      return value[currentLang] || value['fr'] || value['en'] || Object.values(value)[0] || '';
    }
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
  
  private getFocusableElements(): HTMLElement[] {
    return Array.from(
      this.elementRef.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);
  }
}
