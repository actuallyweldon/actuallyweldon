
import React from 'react';
import { Message } from '@/types/message';
import MessageBubble from './MessageBubble';

interface MessageThreadProps {
  messages: Message[];
}

const MessageThread: React.FC<MessageThreadProps> = ({ messages }) => {
  if (!messages.length) return null;
  
  const firstMessage = messages[0];

  return (
    <div className="space-y-2">
      <div>
        <span className="text-xs text-gray-500">
          {new Date(firstMessage.created_at).toLocaleDateString()}
        </span>
      </div>
      
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message} 
        />
      ))}
    </div>
  );
};

export default MessageThread;
