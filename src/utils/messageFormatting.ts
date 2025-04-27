
import { Message } from '@/types/message';

export const formatMessage = (newMessage: any): Message => ({
  ...newMessage,
  sender: newMessage.is_admin ? 'admin' : 'user',
  timestamp: newMessage.created_at,
  message_status: newMessage.message_status || 'sent',
  updated_at: newMessage.updated_at || newMessage.created_at
});
