
import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { Message } from '@/types/message';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  // Map messages to format expected by MessageBubble
  const formattedMessages = messages.map(message => ({
    ...message,
    sender: message.is_admin ? 'admin' as const : 'user' as const,
    timestamp: message.created_at
  }));

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-imessage-background">
      {formattedMessages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
