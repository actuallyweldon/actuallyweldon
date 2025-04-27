import React, { useEffect, useRef } from 'react';
import { Message } from '@/types/message';
import { Loader2 } from 'lucide-react';
import MessageThread from './MessageThread';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  targetUserId?: string;
  showTypingIndicator?: boolean;
  onMarkMessagesRead?: (messageIds: string[]) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading, 
  targetUserId,
  showTypingIndicator = false,
  onMarkMessagesRead
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mark unread messages as read when they're loaded and visible
    const unreadMessages = messages
      .filter(msg => msg.message_status !== 'read')
      .map(msg => msg.id);
      
    if (unreadMessages.length > 0 && onMarkMessagesRead) {
      onMarkMessagesRead(unreadMessages);
    }
  }, [messages, onMarkMessagesRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showTypingIndicator]);

  if (isLoading) {
    return (
      <div className="fixed top-[60px] bottom-[60px] left-0 right-0 flex items-center justify-center bg-imessage-background">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const filteredMessages = targetUserId
    ? messages.filter(msg => 
        msg.sender_id === targetUserId || 
        msg.recipient_id === targetUserId ||
        (msg.is_admin && msg.sender_id === targetUserId)
      )
    : messages;

  if (filteredMessages.length === 0 && !showTypingIndicator) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-500 bg-imessage-background">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  // Group messages by date and thread
  const groupedThreads: { [key: string]: Message[] } = {};
  
  filteredMessages.forEach(message => {
    const date = new Date(message.created_at).toLocaleDateString();
    if (!groupedThreads[date]) {
      groupedThreads[date] = [];
    }
    groupedThreads[date].push(message);
  });

  return (
    <div className="fixed top-[60px] bottom-[60px] left-0 right-0 overflow-y-auto p-4 space-y-4 bg-imessage-background">
      {Object.entries(groupedThreads).map(([date, messages]) => (
        <MessageThread key={date} messages={messages} />
      ))}
      
      {showTypingIndicator && (
        <div className="flex space-x-1 p-2 mb-3" style={{ maxWidth: "80px" }}>
          <div className="message-bubble-admin flex items-center space-x-1 py-3 px-4">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "300ms" }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "600ms" }}></div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
