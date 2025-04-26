
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/message';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const { user } = useSupabaseAuth();
  
  // Message is from current user if sender_id matches current user's id
  const isFromCurrentUser = user?.id === message.sender_id;
  
  const handleMessageClick = () => {
    setShowTimestamp(!showTimestamp);
  };
  
  return (
    <div className={cn(
      'animate-message-appear flex mb-2',
      isFromCurrentUser ? 'justify-end' : 'justify-start'
    )}>
      <div 
        className={isFromCurrentUser ? 'message-bubble-user' : 'message-bubble-admin'} 
        onClick={handleMessageClick}
        style={{
          fontSize: '17px',
          lineHeight: '1.3125',
          padding: '12px 16px'
        }}
      >
        <p>{message.content}</p>
        
        {showTimestamp && (
          <div 
            className={cn(
              'text-[11px] opacity-60 mt-1 transition-opacity duration-200 ease-in-out',
              isFromCurrentUser ? 'text-right' : 'text-left'
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
