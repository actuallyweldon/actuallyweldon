
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/message';
import MessageStatus from './MessageStatus';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showTimestamp, setShowTimestamp] = useState(false);
  
  const handleMessageClick = () => {
    setShowTimestamp(!showTimestamp);
  };
  
  return (
    <div 
      className={cn(
        'animate-message-appear flex flex-col mb-1',
        message.is_admin ? 'items-start' : 'items-end'
      )}
      onClick={handleMessageClick}
    >
      <div 
        className={message.is_admin ? 'message-bubble-admin' : 'message-bubble-user'}
        style={{
          fontSize: '17px',
          fontWeight: 400,
          lineHeight: '1.3125',
          padding: '12px 16px'
        }}
      >
        <p>{message.content}</p>
      </div>
      
      <div className={cn(
        'flex items-center gap-1 px-1 mt-0.5',
        'text-[11px] text-gray-500 transition-opacity duration-200',
        showTimestamp ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
        message.is_admin ? 'flex-row' : 'flex-row-reverse'
      )}>
        <span>
          {new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
        <MessageStatus status={message.message_status} />
      </div>
    </div>
  );
};

export default MessageBubble;
