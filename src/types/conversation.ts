
export interface Conversation {
  sender_id: string;
  last_message: string;
  created_at: string;
  last_message_timestamp: string;
  user_info: UserInfo;
  unread_count?: number;
  is_typing?: boolean;
}

export interface UserInfo {
  username?: string;
  avatar_url?: string;
  status?: 'online' | 'offline' | 'away';
  last_seen?: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ConversationError {
  type: 'fetch' | 'send' | 'update' | 'delete' | 'connection';
  message: string;
  originalError?: any;
  timestamp: string;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}
