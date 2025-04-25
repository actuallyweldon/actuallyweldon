
export type MessageSender = 'user' | 'admin';

export interface Message {
  id: string;
  content: string;
  sender: MessageSender;
  timestamp: string;
  userId?: string;
}
