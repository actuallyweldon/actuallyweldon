
import React from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/message';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  
  return (
    <div className={cn(
      'animate-message-appear flex mb-2',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={isUser ? 'message-bubble-user' : 'message-bubble-admin'}>
        <p>{message.content}</p>
        <div className={cn(
          'text-[10px] opacity-70 mt-1',
          isUser ? 'text-right' : 'text-left'
        )}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
