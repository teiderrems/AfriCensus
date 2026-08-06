import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmState {
  show: boolean;
  title: string;
  message: string;
  variant?: 'default' | 'danger' | 'warning';
  isPrompt?: boolean;
  promptPlaceholder?: string;
  onConfirm: (promptValue?: string) => void;
  onCancel: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  private confirmState = new Subject<ConfirmState>();
  confirmState$ = this.confirmState.asObservable();

  ask(title: string, message: string, variant: 'default' | 'danger' | 'warning' = 'default'): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.confirmState.next({
        show: true,
        title,
        message,
        variant,
        isPrompt: false,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }

  prompt(title: string, message: string, placeholder: string = ''): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.confirmState.next({
        show: true,
        title,
        message,
        variant: 'warning',
        isPrompt: true,
        promptPlaceholder: placeholder,
        onConfirm: (val?: string) => resolve(val || ''),
        onCancel: () => resolve(null)
      });
    });
  }

  close() {
    this.confirmState.next({
      show: false,
      title: '',
      message: '',
      onConfirm: () => {},
      onCancel: () => {}
    });
  }
}
