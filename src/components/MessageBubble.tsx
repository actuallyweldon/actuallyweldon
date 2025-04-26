
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/message';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isUser = !message.is_admin;
  
  const handleMessageClick = () => {
    setShowTimestamp(!showTimestamp);
  };
  
  return (
    <div className={cn(
      'animate-message-appear flex mb-2',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div 
        className={isUser ? 'message-bubble-user' : 'message-bubble-admin'} 
        onClick={handleMessageClick}
      >
        <p>{message.content}</p>
        
        {showTimestamp && (
          <div 
            className={cn(
              'text-[10px] opacity-70 mt-1 transition-opacity duration-200 ease-in-out',
              isUser ? 'text-right' : 'text-left'
            )}
          >
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
