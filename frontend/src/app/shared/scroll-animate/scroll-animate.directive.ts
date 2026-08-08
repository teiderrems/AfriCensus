import { Directive, ElementRef, Input, OnInit, OnDestroy, inject, afterNextRender, Injector } from '@angular/core';

export type ScrollAnimation =
  | 'fade-up'
  | 'fade-down'
  | 'fade-left'
  | 'fade-right'
  | 'scale-up'
  | 'zoom-in'
  | 'flip-up'
  | 'blur-in';

/**
 * Directive to animate elements on scroll using IntersectionObserver.
 *
 * Usage:
 *   <div aclScrollAnimate>                      — defaults to 'fade-up'
 *   <div aclScrollAnimate="scale-up">           — specific animation
 *   <div aclScrollAnimate [animDelay]="200">    — with delay in ms
 *   <div aclScrollAnimate [animDuration]="600">  — custom duration in ms
 *   <div aclScrollAnimate [animOnce]="false">   — re-animate on every scroll in
 */
@Directive({
  selector: '[aclScrollAnimate]',
  standalone: true,
})
export class ScrollAnimateDirective implements OnInit, OnDestroy {
  @Input('aclScrollAnimate') animation: ScrollAnimation | '' = '';
  @Input() animDelay = 0;
  @Input() animDuration = 500;
  @Input() animOnce = true;
  @Input() animThreshold = 0.12;

  private readonly el = inject(ElementRef);
  private readonly injector = inject(Injector);
  private observer: IntersectionObserver | null = null;

  constructor() {
    // Ensure initial hidden state is set synchronously to avoid flash-of-content
    const element = this.el.nativeElement as HTMLElement;
    element.classList.add('scroll-anim-hidden');
  }

  ngOnInit(): void {
    afterNextRender(() => {
      this.setupObserver();
    }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private setupObserver(): void {
    const element = this.el.nativeElement as HTMLElement;
    const anim = this.animation || 'fade-up';

    element.style.setProperty('--scroll-anim-delay', `${this.animDelay}ms`);
    element.style.setProperty('--scroll-anim-duration', `${this.animDuration}ms`);
    element.setAttribute('data-scroll-anim', anim);

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.classList.add('scroll-anim-visible');
            element.classList.remove('scroll-anim-hidden');
            if (this.animOnce) {
              this.observer?.unobserve(element);
            }
          } else if (!this.animOnce) {
            element.classList.remove('scroll-anim-visible');
            element.classList.add('scroll-anim-hidden');
          }
        }
      },
      { threshold: this.animThreshold, rootMargin: '0px 0px -40px 0px' },
    );

    this.observer.observe(element);
  }
}
