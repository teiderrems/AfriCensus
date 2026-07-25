import { Component, Directive, ElementRef, HostListener, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { Overlay, OverlayPositionBuilder, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

@Component({
  selector: 'acl-tooltip',
  standalone: true,
  template: `
    <div class="acl-tooltip-panel" [class.pos-right]="position === 'right'" [class.pos-left]="position === 'left'" [class.pos-bottom]="position === 'bottom'" [class.pos-top]="position === 'top'">
      {{ text }}
    </div>
  `,
  styles: `
    .acl-tooltip-panel {
      position: relative;
      background: var(--surface-high);
      color: var(--ink);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: var(--shadow-md);
      pointer-events: none;
      border: 1px solid var(--outline-soft);
      animation: fadeIn 0.15s ease-out;
      z-index: 10000;
    }
    .dark .acl-tooltip-panel {
      background: var(--surface-high);
      border: 1px solid var(--glass-border);
    }
    
    .pos-right::before {
      content: '';
      position: absolute;
      top: 50%;
      left: -5px;
      transform: translateY(-50%) rotate(45deg);
      width: 8px;
      height: 8px;
      background: inherit;
      border-left: 1px solid var(--outline-soft);
      border-bottom: 1px solid var(--outline-soft);
    }
    .dark .pos-right::before { border-color: var(--glass-border); }

    .pos-left::before {
      content: '';
      position: absolute;
      top: 50%;
      right: -5px;
      transform: translateY(-50%) rotate(45deg);
      width: 8px;
      height: 8px;
      background: inherit;
      border-right: 1px solid var(--outline-soft);
      border-top: 1px solid var(--outline-soft);
    }
    .dark .pos-left::before { border-color: var(--glass-border); }
    
    .pos-bottom::before {
      content: '';
      position: absolute;
      top: -5px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      width: 8px;
      height: 8px;
      background: inherit;
      border-left: 1px solid var(--outline-soft);
      border-top: 1px solid var(--outline-soft);
    }
    .dark .pos-bottom::before { border-color: var(--glass-border); }

    .pos-top::before {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      width: 8px;
      height: 8px;
      background: inherit;
      border-right: 1px solid var(--outline-soft);
      border-bottom: 1px solid var(--outline-soft);
    }
    .dark .pos-top::before { border-color: var(--glass-border); }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `
})
export class TooltipComponent {
  text = '';
  position: 'right' | 'left' | 'bottom' | 'top' = 'bottom';
}

@Directive({
  selector: '[aclTooltip]',
  standalone: true
})
export class AclTooltipDirective implements OnInit, OnDestroy {
  @Input('aclTooltip') text = '';
  private overlayRef: OverlayRef | null = null;
  private tooltipInstance: TooltipComponent | null = null;

  private overlay = inject(Overlay);
  private overlayPositionBuilder = inject(OverlayPositionBuilder);
  private elementRef = inject(ElementRef);

  constructor() {}

  ngOnInit(): void {
    const positionStrategy = this.overlayPositionBuilder
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        {
          originX: 'center', originY: 'bottom',
          overlayX: 'center', overlayY: 'top',
          offsetY: 8,
        },
        {
          originX: 'end', originY: 'center',
          overlayX: 'start', overlayY: 'center',
          offsetX: 12,
        },
        {
          originX: 'start', originY: 'center',
          overlayX: 'end', overlayY: 'center',
          offsetX: -12,
        },
        {
          originX: 'center', originY: 'top',
          overlayX: 'center', overlayY: 'bottom',
          offsetY: -8,
        }
      ]);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close()
    });

    positionStrategy.positionChanges.subscribe(change => {
      if (this.tooltipInstance) {
        const { originY, originX } = change.connectionPair;
        if (originY === 'bottom') {
          this.tooltipInstance.position = 'bottom';
        } else if (originY === 'top') {
          this.tooltipInstance.position = 'top';
        } else if (originX === 'start') {
          this.tooltipInstance.position = 'left';
        } else {
          this.tooltipInstance.position = 'right';
        }
      }
    });
  }

  @HostListener('mouseenter')
  show() {
    if (this.overlayRef && !this.overlayRef.hasAttached() && this.text) {
      const tooltipRef = this.overlayRef.attach(new ComponentPortal(TooltipComponent));
      this.tooltipInstance = tooltipRef.instance;
      this.tooltipInstance.text = this.text;
    }
  }

  @HostListener('mouseleave')
  hide() {
    if (this.overlayRef && this.overlayRef.hasAttached()) {
      this.overlayRef.detach();
      this.tooltipInstance = null;
    }
  }

  ngOnDestroy(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
    }
  }
}
