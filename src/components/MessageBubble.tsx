
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
    <div className={cn(
      'animate-message-appear flex mb-2',  // Reverted from mb-4 back to mb-2
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
        
        <div className={cn(
          'flex items-center justify-between mt-1',
          'text-[11px] opacity-60 transition-opacity duration-200',
          showTimestamp ? 'opacity-60' : 'opacity-0 group-hover:opacity-60'
        )}>
          <span>
            {new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          <MessageStatus status={message.message_status} className="ml-2" />
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
