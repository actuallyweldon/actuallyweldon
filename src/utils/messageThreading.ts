
import { Message } from '@/types/message';

export const groupMessagesByThread = (messages: Message[]) => {
  return messages.reduce((threads, message) => {
    const threadId = message.session_id || message.sender_id || 'default';
    if (!threads[threadId]) {
      threads[threadId] = [];
    }
    threads[threadId].push(message);
    return threads;
  }, {} as Record<string, Message[]>);
};
