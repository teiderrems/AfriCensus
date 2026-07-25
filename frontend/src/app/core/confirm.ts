import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConfirmState {
  show: boolean;
  title: string;
  message: string;
  variant?: 'default' | 'danger' | 'warning';
  onConfirm: () => void;
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
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
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
