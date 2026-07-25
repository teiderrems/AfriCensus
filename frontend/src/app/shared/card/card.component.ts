import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'acl-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css'
})
export class CardComponent {
  @Input() padding: 'none' | 'normal' | 'large' = 'normal';
  
  @HostBinding('class.card') readonly isCard = true;
  @HostBinding('class.padding-none') get isPaddingNone() { return this.padding === 'none'; }
  @HostBinding('class.padding-normal') get isPaddingNormal() { return this.padding === 'normal'; }
  @HostBinding('class.padding-large') get isPaddingLarge() { return this.padding === 'large'; }
}
