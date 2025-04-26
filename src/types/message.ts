
import { MessageStatus } from '@/types/conversation';

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  is_admin: boolean;
  created_at: string;
  updated_at?: string;
  
  // For compatibility with UI components
  sender: 'user' | 'admin';
  timestamp: string;
  status?: MessageStatus;
  pending?: boolean;
}
