
import React from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/message';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = !message.is_admin;
  
  const getStatusIcon = () => {
    if (message.pending) {
      return <Clock className="h-3 w-3 inline ml-1" />;
    }
    
    switch (message.status) {
      case 'sent':
        return <Clock className="h-3 w-3 inline ml-1" />;
      case 'delivered':
        return <CheckCircle2 className="h-3 w-3 inline ml-1" />;
      case 'read':
        return <CheckCircle2 className="h-3 w-3 inline ml-1 text-blue-400" />;
      default:
        return null;
    }
  };
  
  return (
    <div className={cn(
      'animate-message-appear flex mb-2',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        isUser ? 'message-bubble-user' : 'message-bubble-admin',
        message.pending && 'opacity-70'
      )}>
        <p>{message.content}</p>
        <div className={cn(
          'text-[10px] opacity-70 mt-1 flex items-center',
          isUser ? 'justify-end' : 'justify-start'
        )}>
          <span>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && getStatusIcon()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
