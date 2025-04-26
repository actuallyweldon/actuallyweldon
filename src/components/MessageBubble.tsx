
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/message';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showTimestamp, setShowTimestamp] = useState(false);
  
  const handleMessageClick = () => {
    setShowTimestamp(!showTimestamp);
  };
  
  return (
    <div className={cn(
      'animate-message-appear flex mb-2',
      message.is_admin ? 'justify-start' : 'justify-end'
    )}>
      <div 
        className={message.is_admin ? 'message-bubble-admin' : 'message-bubble-user'} 
        onClick={handleMessageClick}
        style={{
          fontSize: '17px',
          fontWeight: 400,
          lineHeight: '1.3125',
          padding: '12px 16px'
        }}
      >
        <p>{message.content}</p>
        
        {showTimestamp && (
          <div 
            className={cn(
              'text-[11px] opacity-60 mt-1 transition-opacity duration-200 ease-in-out',
              message.is_admin ? 'text-left' : 'text-right'
            )}
            style={{
              color: 'rgba(255, 255, 255, 0.6)'
            }}
          >
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;

