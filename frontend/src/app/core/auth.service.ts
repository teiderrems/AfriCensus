import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { LoginResponse, User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'africensus_access_token';
  private readonly refreshKey = 'africensus_refresh_token';
  private readonly userKey = 'africensus_user';
  readonly currentUser = signal<User | null>(this.readUser());

  constructor(private readonly http: HttpClient, private readonly router: Router) {
    this.migrateLegacyStorage();
    if (this.isTokenExpired()) {
      this.clearSession();
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/v1/auth/login', { username, password }).pipe(
      tap((response) => {
        sessionStorage.setItem(this.tokenKey, response.access_token);
        sessionStorage.setItem(this.refreshKey, response.refresh_token);
        sessionStorage.setItem(this.userKey, JSON.stringify(response.user));
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshKey);
        localStorage.removeItem(this.userKey);
        this.currentUser.set(response.user);
      }),
    );
  }

  forgotPassword(identifier: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/v1/auth/forgot-password', { identifier });
  }

  resetPassword(token: string, new_password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/v1/auth/reset-password', { token, new_password });
  }

  token(): string | null {
    if (this.isTokenExpired()) {
      this.clearSession();
      return null;
    }
    return sessionStorage.getItem(this.tokenKey);
  }

  logout(): void {
    this.clearSession();
    this.router.navigateByUrl('/login');
  }

  isLoggedIn(): boolean {
    return Boolean(this.token() && this.currentUser());
  }

  private readUser(): User | null {
    const raw = sessionStorage.getItem(this.userKey) || localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  private isTokenExpired(): boolean {
    const token = sessionStorage.getItem(this.tokenKey) || localStorage.getItem(this.tokenKey);
    if (!token) {
      return false;
    }
    const payload = this.decodePayload(token);
    if (!payload?.exp) {
      return true;
    }
    return payload.exp * 1000 <= Date.now();
  }

  private decodePayload(token: string): { exp?: number } | null {
    try {
      const body = token.split('.')[1];
      const normalized = body.replace(/-/g, '+').replace(/_/g, '/');
      const decodedStr = decodeURIComponent(
        atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='))
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(decodedStr) as { exp?: number };
    } catch {
      return null;
    }
  }

  private migrateLegacyStorage(): void {
    for (const key of [this.tokenKey, this.refreshKey, this.userKey]) {
      const legacy = localStorage.getItem(key);
      if (legacy && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, legacy);
      }
      localStorage.removeItem(key);
    }
  }

  private clearSession(): void {
    for (const key of [this.tokenKey, this.refreshKey, this.userKey]) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
    this.currentUser.set(null);
  }
}
