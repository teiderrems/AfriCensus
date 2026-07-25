import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { inject } from '@angular/core';

@Component({
  selector: 'acl-modal',
  imports: [LucideAngularModule, NgTemplateOutlet, ButtonComponent, AclTooltipDirective],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent implements OnChanges, OnDestroy {
  readonly i18n = inject(I18nService);
  @Input({ required: true }) open = false;
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() variant: 'default' | 'danger' | 'warning' = 'default';
  @Input() titleId = `modal-title-${Math.random().toString(36).slice(2)}`;
  @Input() isForm = false;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly submitted = new EventEmitter<void>();

  private previousFocus: HTMLElement | null = null;
  private focusTimeout: any;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.previousFocus = document.activeElement as HTMLElement;
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
    clearTimeout(this.focusTimeout);
    if (this.previousFocus) {
      this.previousFocus.focus();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (this.open) {
      event.preventDefault();
      this.closed.emit();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
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

  private getFocusableElements(): HTMLElement[] {
    return Array.from(
      this.elementRef.nativeElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);
  }
}
