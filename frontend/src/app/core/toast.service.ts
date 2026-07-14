import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  success(title: string, message?: string): void {
    this.add('success', title, message);
  }

  error(title: string, message?: string): void {
    this.add('error', title, message);
  }

  info(title: string, message?: string): void {
    this.add('info', title, message);
  }

  remove(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  private add(type: ToastType, title: string, message?: string): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, type, title, message };
    
    this.toasts.update((current) => [...current, toast]);

    // Auto-dismiss after 4.5 seconds
    setTimeout(() => {
      this.remove(id);
    }, 4500);
  }
}
