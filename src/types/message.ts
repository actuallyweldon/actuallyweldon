
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  recipient_id?: string | null;  // Add support for recipient_id
  is_admin: boolean;
  created_at: string;
  
  // For compatibility with UI components
  sender: 'user' | 'admin';
  timestamp: string;
}

export interface TypingIndicator {
  userId?: string | null;
  sessionId?: string | null;
  isTyping: boolean;
  lastTyped: Date;
}
