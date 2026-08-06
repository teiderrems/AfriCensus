import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ChatGroup, ChatMessage, ConversationSummary } from './models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MessagingService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = '/api/v1/messages';

  readonly conversations = signal<ConversationSummary[]>([]);
  readonly activeConversationId = signal<string | null>(null);
  readonly activeConversation = computed(() => {
    const id = this.activeConversationId();
    if (!id) return null;
    return this.conversations().find(c => c.id === id) || null;
  });

  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal<boolean>(false);
  readonly sending = signal<boolean>(false);

  // Realtime Status
  readonly isRealtimeActive = signal<boolean>(false);

  // Typing indicator: map of "sender_id" -> sender_name
  readonly typingUsers = signal<Record<string, string>>({});

  private socket: WebSocket | null = null;
  private pollingInterval: any = null;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private typingTimer: any = null;
  private isTyping = false;
  private visibilityListener: (() => void) | null = null;

  constructor() {
    this.initRealtimeConnection();
    this.setupVisibilityListener();
  }

  ngOnDestroy(): void {
    this.closeRealtimeConnection();
    this.stopPolling();
    this.stopPingInterval();
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
    }
    if (this.typingTimer) clearTimeout(this.typingTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  // ─── Realtime WebSocket ──────────────────────────────────────────────────

  initRealtimeConnection(): void {
    const token = this.auth.token();

    if (!token) {
      this.startPolling();
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.initRealtimeConnection();
        }, 1500);
      }
      return;
    }

    // Avoid duplicate sockets
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/v1/messages/ws?token=${encodeURIComponent(token)}`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isRealtimeActive.set(true);
        this.stopPolling();
        this.startPingInterval();
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'message_received':
              this.handleIncomingMessage(data.payload as ChatMessage);
              break;
            case 'reaction_updated':
              this.handleReactionUpdate(data.payload as ChatMessage);
              break;
            case 'message_deleted':
              this.handleReactionUpdate(data.payload as ChatMessage); // reuse: replaces message in list
              break;
            case 'typing':
              this.handleTypingEvent(data);
              break;
            case 'pong':
              // keepalive OK
              break;
          }
        } catch {
          // Ignore malformed WS payloads
        }
      };

      this.socket.onerror = () => {
        this.fallbackToPolling();
      };

      this.socket.onclose = () => {
        this.fallbackToPolling();
      };
    } catch {
      this.fallbackToPolling();
    }
  }

  private setupVisibilityListener(): void {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
          this.initRealtimeConnection();
        }
        this.refreshData();
      }
    };
    this.visibilityListener = handler;
    document.addEventListener('visibilitychange', handler);
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch {
          this.fallbackToPolling();
        }
      } else {
        this.fallbackToPolling();
      }
    }, 15000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private fallbackToPolling(): void {
    this.isRealtimeActive.set(false);
    this.stopPingInterval();
    this.startPolling();
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.socket = null;
        this.initRealtimeConnection();
      }, 2500);
    }
  }

  private closeRealtimeConnection(): void {
    this.stopPingInterval();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private startPolling(): void {
    if (this.pollingInterval) return;
    this.pollingInterval = setInterval(() => this.refreshData(), 3500);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private refreshData(): void {
    this.loadConversations().subscribe();
    const activeId = this.activeConversationId();
    if (activeId) {
      this.fetchMessages(activeId, true);
    }
  }

  // ─── Typing Indicator ────────────────────────────────────────────────────

  sendTypingStart(): void {
    const conv = this.activeConversation();
    if (!conv || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    if (!this.isTyping) {
      this.isTyping = true;
      this.socket.send(JSON.stringify({
        type: 'typing_start',
        target_id: conv.id,
        is_group: conv.is_group
      }));
    }

    // Auto-stop typing after 3 seconds of inactivity
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.sendTypingStop(), 3000);
  }

  sendTypingStop(): void {
    const conv = this.activeConversation();
    if (!this.isTyping) return;
    this.isTyping = false;

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }

    if (conv && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'typing_stop',
        target_id: conv.id,
        is_group: conv.is_group
      }));
    }
  }

  private handleTypingEvent(data: any): void {
    const senderId: string = data.sender_id;
    const currentUserId = this.auth.currentUser()?.id;

    // Never show typing indicator to the user themselves
    if (senderId && currentUserId && senderId === currentUserId) return;

    const senderName: string = data.sender_name || 'Quelqu\'un';
    const isTyping: boolean = data.is_typing;
    const targetId: string = data.target_id;
    const activeId = this.activeConversationId();

    // Only show if the typing is for our active conversation
    if (activeId !== targetId && activeId !== senderId) return;

    this.typingUsers.update(current => {
      const updated = { ...current };
      if (isTyping) {
        updated[senderId] = senderName;
      } else {
        delete updated[senderId];
      }
      return updated;
    });

    // Auto-clear after 4 seconds in case stop event is missed
    if (isTyping) {
      setTimeout(() => {
        this.typingUsers.update(current => {
          const updated = { ...current };
          delete updated[senderId];
          return updated;
        });
      }, 4000);
    }
  }

  // ─── Incoming Message / Reaction Handlers ───────────────────────────────

  private handleIncomingMessage(msg: ChatMessage): void {
    const activeId = this.activeConversationId();

    // Add to messages list if relevant to active conversation
    if (activeId && (activeId === msg.receiver_id || activeId === msg.sender_id || (msg.is_group && activeId === msg.receiver_id))) {
      this.messages.update(list => {
        if (list.some(m => m.id === msg.id)) return list;
        return [...list, msg];
      });
    }

    // Clear typing indicator for this sender
    this.typingUsers.update(current => {
      const updated = { ...current };
      delete updated[msg.sender_id];
      return updated;
    });

    // Refresh conversation list
    this.loadConversations().subscribe();
  }

  private handleReactionUpdate(msg: ChatMessage): void {
    this.messages.update(list => list.map(m => m.id === msg.id ? msg : m));
  }

  // ─── API Methods ─────────────────────────────────────────────────────────

  loadConversations(): Observable<ConversationSummary[]> {
    return this.http.get<ConversationSummary[]>(`${this.baseUrl}/conversations`).pipe(
      tap({
        next: (items) => {
          this.conversations.set(items);
          if (!this.activeConversationId() && items.length > 0) {
            this.selectConversation(items[0].id);
          }
        }
      })
    );
  }

  selectConversation(targetId: string): void {
    this.activeConversationId.set(targetId);
    this.typingUsers.set({});
    this.isTyping = false;
    this.fetchMessages(targetId);
  }

  fetchMessages(targetId: string, silent: boolean = false): void {
    if (!silent) this.loading.set(true);
    this.http.get<ChatMessage[]>(`${this.baseUrl}/${targetId}`).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.conversations.update(list =>
          list.map(c => c.id === targetId ? { ...c, unread_count: 0 } : c)
        );
        if (!silent) this.loading.set(false);
      },
      error: () => {
        if (!silent) this.loading.set(false);
      }
    });
  }

  sendMessage(content: string, replyTo?: string | null): Observable<ChatMessage> {
    const activeId = this.activeConversationId();
    if (!activeId) throw new Error('Aucune conversation sélectionnée');

    const conv = this.activeConversation();
    const isGroup = conv ? conv.is_group : false;

    this.sendTypingStop();
    this.sending.set(true);

    const body = {
      content,
      receiver_id: activeId,
      is_group: isGroup,
      reply_to: replyTo || null
    };

    return this.http.post<ChatMessage>(this.baseUrl, body).pipe(
      tap({
        next: (newMsg) => {
          this.sending.set(false);
          this.messages.update(list => {
            if (list.some(m => m.id === newMsg.id)) return list;
            return [...list, newMsg];
          });
          this.conversations.update(list =>
            list.map(c =>
              c.id === activeId
                ? { ...c, last_message: newMsg.content, last_timestamp: newMsg.timestamp }
                : c
            )
          );
        },
        error: () => this.sending.set(false)
      })
    );
  }

  toggleReaction(messageId: string, emoji: string): void {
    this.http.post<ChatMessage>(`${this.baseUrl}/${messageId}/reactions`, { emoji }).subscribe({
      next: (updatedMsg) => {
        this.messages.update(list => list.map(m => m.id === messageId ? updatedMsg : m));
      }
    });
  }

  deleteMessage(messageId: string): void {
    this.http.delete<{ success: boolean; id: string }>(`${this.baseUrl}/${messageId}`).subscribe({
      next: () => {
        // Optimistic update: mark as deleted locally
        this.messages.update(list =>
          list.map(m => m.id === messageId
            ? { ...m, content: '[Message supprimé]', reactions: {}, reply_to: null }
            : m
          )
        );
      }
    });
  }

  createGroup(name: string): Observable<ChatGroup> {
    return this.http.post<ChatGroup>(`${this.baseUrl}/groups`, { name }).pipe(
      tap({ next: () => { this.loadConversations().subscribe(); } })
    );
  }
}
