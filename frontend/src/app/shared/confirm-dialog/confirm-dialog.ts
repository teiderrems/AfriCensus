import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '../button/button';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { ConfirmService, ConfirmState } from '@/app/core/confirm';

@Component({
  selector: 'app-confirm-dialog',
  imports: [CommonModule, FormsModule, LucideAngularModule, ButtonComponent],
  standalone: true,
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css'
})
export class ConfirmDialogComponent implements OnDestroy {
  state: ConfirmState = {
    show: false,
    title: '',
    message: '',
    onConfirm: () => { },
    onCancel: () => { }
  };
  promptValue: string = '';
  private sub: Subscription;

  constructor(private confirmService: ConfirmService, public i18n: I18nService) {
    this.sub = this.confirmService.confirmState$.subscribe(state => {
      this.state = state;
      if (state.show && state.isPrompt) {
        this.promptValue = '';
      }
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  confirm() {
    this.state.onConfirm(this.state.isPrompt ? this.promptValue : undefined);
    this.confirmService.close();
  }

  cancel() {
    this.state.onCancel();
    this.confirmService.close();
  }
}
