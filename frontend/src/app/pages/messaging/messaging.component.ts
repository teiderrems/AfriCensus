import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MessagingService } from '../../core/messaging.service';
import { ToastService } from '../../core/toast.service';
import { ChatMessage, ConversationSummary } from '../../core/models';
import { ModalComponent } from '../../shared/modal/modal.component';
import { ButtonComponent } from "@/app/shared/button/button";
import { AclTooltipDirective } from '../../shared/tooltip/tooltip';

import { OverlayModule, ConnectionPositionPair } from '@angular/cdk/overlay';

@Component({
  selector: 'acl-messaging',
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, ButtonComponent, AclTooltipDirective, OverlayModule],
  templateUrl: './messaging.component.html',
  styleUrl: './messaging.component.css'
})
export class MessagingComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly messaging = inject(MessagingService);
  readonly toast = inject(ToastService);

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {
    // Auto-scroll whenever messages list changes
    effect(() => {
      const msgs = this.messaging.messages();
      if (msgs.length > 0) {
        this.scrollToBottom();
      }
    });
  }

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageTextarea') private messageTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  searchQuery = signal<string>('');
  activeFilter = signal<'ALL' | 'DIRECT' | 'GROUPS'>('ALL');
  newMessageText = signal<string>('');
  replyingTo = signal<ChatMessage | null>(null);
  sidebarCollapsed = signal<boolean>(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(c => !c);
  }

  onSearchClick(): void {
    if (this.sidebarCollapsed()) {
      this.sidebarCollapsed.set(false);
      setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
    }
  }

  // Emoji Picker State & Categories
  showEmojiPicker = signal<boolean>(false);
  activeReactionMessage = signal<ChatMessage | null>(null);
  emojiSearch = signal<string>('');

  reactionPositions: ConnectionPositionPair[] = [
    { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -12 },
    { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 12 },
    { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -12 },
    { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 12 }
  ];

  readonly emojiCategories = [
    {
      name: 'messaging.emoji.cat.smileys',
      emojis: [
        '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '🥹', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
        '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
        '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥',
        '😓', '🫣', '🤗', '🫡', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🫠', '🙄', '😯', '😦', '😧',
        '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿'
      ]
    },
    {
      name: 'messaging.emoji.cat.hands',
      emojis: [
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '🫵', '👈', '👉', '👆', '👇',
        '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦵', '🦶'
      ]
    },
    {
      name: 'messaging.emoji.cat.hearts',
      emojis: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '🩷', '🩵', '🩶', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗',
        '💖', '💘', '💝', '💟', '💌', '💯', '💢', '💥', '💫', '💦', '💨', '💣', '💬', '💭'
      ]
    },
    {
      name: 'messaging.emoji.cat.symbols',
      emojis: [
        '✅', '❌', '✔️', '❎', '➕', '➖', '➗', '❓', '❔', '❕', '❗', '⚠️', '🚨', '⛔', '🚫', '🛑', '🔔', '🔕', '📢',
        '📣', '📌', '📍', '💡', '🔍', '🔎', '🔓', '🔒', '🔑', '🏷️', '🚩', '🏁', '⭐', '🌟', '✨', '⚡', '🔥', '🎉', '🎊', '🎁'
      ]
    },
    {
      name: 'messaging.emoji.cat.animals',
      emojis: [
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
        '🐔', '🐧', '🐦', '🦅', '🦆', '🦉', '🦩', '🦚', '🦜', '🐺', '🐗', '🐴', '🦄', '🐝', '🦋', '🐌',
        '☀️', '🌤️', '⛅', '☁️', '🌧️', '⛈️', '🌩️', '🌨️', '🌈', '🌱', '🌿', '☘️', '🍀', '🌴', '🌳', '🌲'
      ]
    },
    {
      name: 'messaging.emoji.cat.food',
      emojis: [
        '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍆',
        '🥔', '🥕', '🌽', '🌶️', '🥒', '🥬', '🥦', '🧄', '🧅', '🍞', '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🍿', '🍩', '🎂',
        '☕', '🍵', '🧃', '🥤', '🧋', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '🧊'
      ]
    },
    {
      name: 'messaging.emoji.cat.objects',
      emojis: [
        '📱', '📲', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '📷', '📹', '🎥', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️',
        '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🗑️', '🛒', '📦', '🏷️', '📄', '📃', '📑', '📊'
      ]
    }
  ];

  readonly filteredEmojiCategories = computed(() => {
    const query = this.emojiSearch().toLowerCase().trim();
    if (!query) return this.emojiCategories;

    return this.emojiCategories.filter(cat => 
      this.i18n.t(cat.name).toLowerCase().includes(query)
    );
  });

  // Group Creation Modal State
  showGroupModal = signal<boolean>(false);
  newGroupName = signal<string>('');

  readonly currentUser = this.auth.currentUser;

  readonly filteredConversations = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.activeFilter();
    let list = this.messaging.conversations();

    if (filter === 'DIRECT') list = list.filter(c => !c.is_group);
    if (filter === 'GROUPS') list = list.filter(c => c.is_group);

    if (q) {
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.role && c.role.toLowerCase().includes(q)));
    }
    return list;
  });

  readonly activeConv = this.messaging.activeConversation;
  readonly messagesList = this.messaging.messages;
  readonly typingUsersArray = computed(() =>
    Object.values(this.messaging.typingUsers())
  );

  /** Messages grouped by date for date separators */
  readonly groupedMessages = computed(() => {
    const msgs = this.messaging.messages();
    const groups: Array<{ dateLabel: string; messages: ChatMessage[] }> = [];
    let currentLabel = '';

    for (const msg of msgs) {
      const label = this.formatDateSeparator(msg.timestamp);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ dateLabel: label, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  });

  // Mobile 1-Column Toggle State
  mobileShowChat = signal<boolean>(false);

  ngOnInit(): void {
    this.messaging.loadConversations().subscribe();
  }

  selectConversation(conv: ConversationSummary): void {
    this.replyingTo.set(null);
    this.messaging.selectConversation(conv.id);
    this.mobileShowChat.set(true);
    this.scrollToBottom();
  }

  backToConversations(): void {
    this.mobileShowChat.set(false);
  }

  setFilter(filter: 'ALL' | 'DIRECT' | 'GROUPS'): void {
    this.activeFilter.set(filter);
  }

  onSendMessage(): void {
    const text = this.newMessageText().trim();
    if (!text) return;

    const replyId = this.replyingTo()?.id || null;
    this.messaging.sendMessage(text, replyId).subscribe({
      next: () => {
        this.newMessageText.set('');
        this.replyingTo.set(null);
        this.scrollToBottom();
        this.autoResizeTextarea();
      },
      error: () => {
        this.toast.error(this.i18n.t('error.default.message'));
      }
    });
  }

  onTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSendMessage();
    }
  }

  autoResizeTextarea(): void {
    setTimeout(() => {
      if (this.messageTextarea?.nativeElement) {
        const el = this.messageTextarea.nativeElement;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 140) + 'px';
      }
    }, 0);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (this.showEmojiPicker()) {
      if (!target.closest('.input-row .emoji-picker-container') && !target.closest('.cdk-overlay-container')) {
        this.showEmojiPicker.set(false);
      }
    }
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker.update(v => !v);
  }

  insertEmoji(emoji: string): void {
    this.newMessageText.update(text => text + emoji);
  }

  setReplyTo(msg: ChatMessage): void {
    this.replyingTo.set(msg);
  }

  cancelReply(): void {
    this.replyingTo.set(null);
  }

  addReaction(msg: ChatMessage, emoji: string): void {
    this.messaging.toggleReaction(msg.id, emoji);
  }

  openReactionPicker(msg: ChatMessage, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.activeReactionMessage.set(msg);
  }

  closeReactionPicker(): void {
    this.activeReactionMessage.set(null);
  }

  selectReaction(emoji: string): void {
    const msg = this.activeReactionMessage();
    if (msg) {
      this.addReaction(msg, emoji);
      this.closeReactionPicker();
    }
  }

  deleteMessage(msg: ChatMessage): void {
    if (msg.content === this.i18n.t('messaging.messageDeleted')) return;
    this.messaging.deleteMessage(msg.id);
  }

  copyMessage(content: string): void {
    if (content === this.i18n.t('messaging.messageDeleted')) return;
    navigator.clipboard.writeText(content).then(() => {
      this.toast.success(this.i18n.t('messaging.toast.copied'));
    }).catch(() => {
      this.toast.error(this.i18n.t('messaging.toast.copyError'));
    });
  }

  /** Returns the content of the message being replied to, or a fallback */
  getReplyContent(replyToId: string | null | undefined): string {
    if (!replyToId) return '';
    const found = this.messaging.messages().find(m => m.id === replyToId);
    if (found) return found.content.length > 80 ? found.content.slice(0, 80) + '…' : found.content;
    return this.i18n.t('messaging.originalMessage');
  }

  /** Returns the sender name of the message being replied to */
  getReplyAuthor(replyToId: string | null | undefined): string {
    if (!replyToId) return '';
    const found = this.messaging.messages().find(m => m.id === replyToId);
    if (!found) return '';
    return found.sender_id === this.currentUser()?.id ? this.i18n.t('messaging.you') : (found.sender_name || '');
  }

  openGroupModal(): void {
    this.newGroupName.set('');
    this.showGroupModal.set(true);
  }

  closeGroupModal(): void {
    this.showGroupModal.set(false);
  }

  submitGroup(): void {
    const name = this.newGroupName().trim();
    if (!name) return;

    this.messaging.createGroup(name).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('messaging.toast.groupCreated'));
        this.closeGroupModal();
      },
      error: () => {
        this.toast.error(this.i18n.t('messaging.toast.groupError'));
      }
    });
  }

  formatTime(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  formatDateSeparator(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);

      const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

      if (isSameDay(d, now)) return "Aujourd'hui";
      if (isSameDay(d, yesterday)) return this.i18n.t('messaging.date.yesterday');

      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 80);
  }
}
