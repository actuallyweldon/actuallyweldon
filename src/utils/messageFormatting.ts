
import { Message } from '@/types/message';

export const formatMessage = (newMessage: any): Message => ({
  ...newMessage,
  sender: newMessage.is_admin ? 'admin' : 'user',
  timestamp: newMessage.created_at
});
