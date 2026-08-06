import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy, signal } from '@angular/core';
import { AppNotification } from './models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal<number>(0);
  private eventSource?: EventSource;

  constructor(private readonly http: HttpClient, private readonly auth: AuthService) {
    if (this.auth.isLoggedIn()) {
      this.fetchNotifications();
      this.connectSSE();
    }
  }

  ngOnDestroy(): void {
    this.disconnectSSE();
  }

  fetchNotifications(): void {
    this.http.get<AppNotification[]>('/api/v1/notifications').subscribe({
      next: (data) => {
        this.notifications.set(data);
        this.updateUnreadCount(data);
      },
      error: () => {
        // Ignorer silencieusement pour éviter de polluer l'UI
      }
    });
  }

  private connectSSE(): void {
    const token = this.auth.token();
    if (!token) return;

    this.eventSource = new EventSource(`/api/v1/notifications/stream?token=${encodeURIComponent(token)}`);
    
    this.eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data) as AppNotification;
        const current = this.notifications();
        // Eviter les doublons
        if (!current.some(n => n.id === newNotif.id)) {
          const updated = [newNotif, ...current];
          this.notifications.set(updated);
          this.updateUnreadCount(updated);
        }
      } catch (e) {
        console.error('Erreur parsing notification SSE:', e);
      }
    };

    this.eventSource.onerror = () => {
      // Reconnexion gérée automatiquement par le navigateur, 
      // mais on pourrait fermer si erreur d'auth.
    };
  }

  private disconnectSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  markAsRead(id: string): void {
    this.http.patch(`/api/v1/notifications/${id}/read`, {}).subscribe(() => {
      const updated = this.notifications().map(n => n.id === id ? { ...n, is_read: true } : n);
      this.notifications.set(updated);
      this.updateUnreadCount(updated);
    });
  }

  private updateUnreadCount(notifs: AppNotification[]): void {
    this.unreadCount.set(notifs.filter(n => !n.is_read).length);
  }
}
