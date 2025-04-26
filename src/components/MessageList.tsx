
import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { Message } from '@/types/message';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  targetUserId?: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, targetUserId }) => {
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
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Filter messages by targetUserId if provided (for admin view)
  const filteredMessages = targetUserId
    ? messages.filter(msg => msg.sender_id === targetUserId || (msg.is_admin && msg.sender_id === targetUserId))
    : messages;

  if (filteredMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-500">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  // Group messages by date for better UI organization
  const groupedMessages: {[key: string]: Message[]} = {};
  filteredMessages.forEach(message => {
    const date = new Date(message.created_at).toLocaleDateString();
    if (!groupedMessages[date]) {
      groupedMessages[date] = [];
    }
    groupedMessages[date].push(message);
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-imessage-background">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="space-y-2">
          <div className="flex justify-center my-4">
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
              {date}
            </span>
          </div>
          {dateMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
