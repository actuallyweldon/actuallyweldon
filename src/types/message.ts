
export interface Message {
  id: string;
  content: string;
  sender_id: string | null;
  recipient_id?: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  message_status: string;
  session_id?: string | null;
  
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
