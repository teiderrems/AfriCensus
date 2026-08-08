import { Injectable, inject, afterNextRender } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Global service that automatically applies scroll-reveal animations
 * to common page elements (headers, cards, tables, etc.) after each
 * navigation. This avoids having to add the directive to every single
 * template in the application.
 *
 * Elements are observed via IntersectionObserver and animated using
 * the CSS classes defined in styles.css (.scroll-anim-hidden / .scroll-anim-visible).
 */

const AUTO_ANIMATE_SELECTORS = [
  '.page-head',
  '.page-header',
  '.portal-hero',
  '.kpi-card',
  '.kpi-grid',
  '.card',
  'acl-card',
  '.table-wrap',
  '.mobile-list',
  '.stats',
  '.content-grid',
  '.portal-grid',
  '.filters-bar',
  '.admin-grid',
  '.health-grid',
  '.security-grid',
  '.config-grid',
];

/** Maps selectors to animation types for variety */
const ANIMATION_MAP: Record<string, string> = {
  '.page-head': 'fade-up',
  '.page-header': 'fade-up',
  '.portal-hero': 'fade-up',
  '.kpi-card': 'scale-up',
  '.card': 'fade-up',
  'acl-card': 'fade-up',
  '.table-wrap': 'fade-up',
  '.mobile-list': 'fade-up',
  '.stats': 'fade-up',
  '.content-grid': 'fade-up',
  '.portal-grid': 'fade-up',
  '.filters-bar': 'fade-up',
  '.kpi-grid': 'fade-up',
  '.admin-grid': 'fade-up',
  '.health-grid': 'fade-up',
  '.security-grid': 'fade-up',
  '.config-grid': 'fade-up',
};

@Injectable({ providedIn: 'root' })
export class ScrollAnimateService {
  private readonly router = inject(Router);
  private observer: IntersectionObserver | null = null;
  private observedElements = new Set<Element>();

  constructor() {
    afterNextRender(() => {
      this.initObserver();
      this.scanAndObserve();

      // Re-scan after each navigation
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(() => {
          // Small delay to let Angular render the new route
          setTimeout(() => this.scanAndObserve(), 60);
        });
    });
  }

  private initObserver(): void {
    if (this.observer) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-anim-visible');
            entry.target.classList.remove('scroll-anim-hidden');
            this.observer?.unobserve(entry.target);
            this.observedElements.delete(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' },
    );
  }

  private scanAndObserve(): void {
    if (!this.observer) return;

    // Scan across the whole document (covers both authenticated shell and public pages)
    const root = document;

    for (const selector of AUTO_ANIMATE_SELECTORS) {
      const elements = root.querySelectorAll(selector);
      elements.forEach((el, index) => {
        // Skip if already processed or already visible
        if (this.observedElements.has(el) || el.classList.contains('scroll-anim-visible')) {
          return;
        }

        // Don't animate elements that are nested inside already-animated parents
        // (e.g., a card inside a stats grid that's already animated)
        if (el.closest('[data-scroll-anim]') && !el.hasAttribute('data-scroll-anim')) {
          // Only skip if the element doesn't have its own explicit animation
          return;
        }

        // Determine animation type
        const animType = ANIMATION_MAP[selector] || 'fade-up';
        el.setAttribute('data-scroll-anim', animType);

        // Apply stagger delay for sibling elements
        const delay = Math.min(index * 60, 400);
        (el as HTMLElement).style.setProperty('--scroll-anim-delay', `${delay}ms`);
        (el as HTMLElement).style.setProperty('--scroll-anim-duration', '500ms');

        el.classList.add('scroll-anim-hidden');
        this.observedElements.add(el);
        this.observer!.observe(el);
      });
    }
  }
}
