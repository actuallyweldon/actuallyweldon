
import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useVirtualizer } from '@tanstack/react-virtual';
import MessageBubble from './MessageBubble';
import { Message } from '@/types/message';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  targetUserId?: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading, targetUserId }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter messages by targetUserId if provided (for admin view)
  const filteredMessages = targetUserId
    ? messages.filter(msg => msg.sender_id === targetUserId || (msg.is_admin && msg.sender_id === targetUserId))
    : messages;

  // Group messages by date for better UI organization
  const groupedMessageDates: { [key: string]: Message[] } = {};
  
  filteredMessages.forEach(message => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!groupedMessageDates[date]) {
      groupedMessageDates[date] = [];
    }
    groupedMessageDates[date].push(message);
  });
  
  // Convert to array for virtualization
  const groupedMessagesArray = Object.entries(groupedMessageDates).map(([date, messages]) => ({
    date,
    messages,
    formattedDate: format(new Date(date), 'MMMM d, yyyy')
  }));

  // Set up virtualization for message groups
  const rowVirtualizer = useVirtualizer({
    count: groupedMessagesArray.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => 60 + groupedMessagesArray[index].messages.length * 80,
    overscan: 5
  });

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    
    // Alternative scroll method for virtual list
    if (parentRef.current && filteredMessages.length > 0) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (filteredMessages.length) {
      scrollToBottom();
    }
  }, [filteredMessages.length]);

  // Initial scroll on load
  useEffect(() => {
    // Use 'auto' for initial scroll to avoid animation on first load
    scrollToBottom('auto');
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (filteredMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center text-gray-500">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="flex-1 overflow-y-auto p-4 space-y-6 bg-imessage-background"
      style={{ height: '100%', position: 'relative' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const { date, messages, formattedDate } = groupedMessagesArray[virtualRow.index];
          return (
            <div
              key={date}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex justify-center my-4">
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                  {formattedDate}
                </span>
              </div>
              <div className="space-y-2">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
