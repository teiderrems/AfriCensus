import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'acl-button',
  imports: [CommonModule],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'danger' | 'warning' | 'primary-light' | 'icon-action' | 'icon-action-danger' | 'icon-action-warning' | 'action-btn' | 'nav-btn' | 'drawer-close' | 'date-trigger' | 'none' = 'primary';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() size: 'sm' | 'md' = 'md';
  @Input() title = '';
  @Input() tooltip = '';
  @Input() iconOnly = false;
  @Input() disabled = false;
  @Input() loading = false;

  @HostBinding('style.pointer-events')
  get pointerEvents(): string {
    return (this.disabled || this.loading) ? 'none' : 'auto';
  }
}
