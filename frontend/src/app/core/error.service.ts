import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

import { I18nService } from './i18n/i18n.service';

import { ToastService } from './toast.service';

export interface AppError {
  status: number;
  title: string;
  message: string;
  details: string[];
  url?: string;
  timestamp: string;
}

type FastApiValidationError = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};

@Injectable({ providedIn: 'root' })
export class ErrorService {
  readonly current = signal<AppError | null>(null);

  constructor(
    private readonly i18n: I18nService,
    private readonly toastService: ToastService
  ) {}

  fromHttp(error: HttpErrorResponse): AppError {
    const details = this.extractDetails(error.error);
    const message = details[0] || this.messageForStatus(error.status);
    return {
      status: error.status,
      title: this.titleForStatus(error.status),
      message,
      details,
      url: error.url || undefined,
      timestamp: new Date().toISOString(),
    };
  }

  publish(error: AppError): void {
    this.current.set(error);
    const fullMessage = error.details.length > 0 ? `${error.message} - ${error.details.join(', ')}` : error.message;
    this.toastService.error(error.title, fullMessage);
  }

  clear(): void {
    this.current.set(null);
  }

  private extractDetails(payload: unknown): string[] {
    if (!payload) {
      return [];
    }
    if (typeof payload === 'string') {
      return [payload];
    }
    if (Array.isArray(payload)) {
      return payload.flatMap((item) => this.extractDetails(item));
    }
    if (typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const detail = record['detail'];
      if (Array.isArray(detail)) {
        return detail.map((item) => this.formatValidationDetail(item)).filter(Boolean);
      }
      if (typeof detail === 'string') {
        return [detail];
      }
      if (typeof record['message'] === 'string') {
        return [record['message']];
      }
      if (typeof record['error'] === 'string') {
        return [record['error']];
      }
    }
    return [];
  }

  private formatValidationDetail(value: unknown): string {
    if (!value || typeof value !== 'object') {
      return String(value || '');
    }
    const detail = value as FastApiValidationError;
    const path = detail.loc?.filter((part) => part !== 'body').join('.');
    const fallback = this.i18n.t('error.invalidValue');
    return path ? `${path}: ${detail.msg || fallback}` : detail.msg || fallback;
  }

  private titleForStatus(status: number): string {
    if (status === 0) return this.i18n.t('error.backendUnavailable.title');
    if (status === 400) return this.i18n.t('error.badRequest.title');
    if (status === 401) return this.i18n.t('error.unauthorized.title');
    if (status === 403) return this.i18n.t('error.forbidden.title');
    if (status === 404) return this.i18n.t('error.notFound.title');
    if (status === 409) return this.i18n.t('error.conflict.title');
    if (status === 422) return this.i18n.t('error.validation.title');
    if (status >= 500) return this.i18n.t('error.server.title');
    return this.i18n.t('error.api.title');
  }

  private messageForStatus(status: number): string {
    if (status === 0) return this.i18n.t('error.backendUnavailable.message');
    if (status === 401) return this.i18n.t('error.unauthorized.message');
    if (status === 403) return this.i18n.t('error.forbidden.message');
    if (status === 404) return this.i18n.t('error.notFound.message');
    if (status === 422) return this.i18n.t('error.validation.message');
    if (status >= 500) return this.i18n.t('error.server.message');
    return this.i18n.t('error.default.message');
  }
}
