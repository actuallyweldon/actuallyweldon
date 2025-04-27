import React, { useState } from 'react';
import { Message } from '@/types/message';
import MessageBubble from './MessageBubble';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageThreadProps {
  messages: Message[];
  isExpanded?: boolean;
}

const MessageThread: React.FC<MessageThreadProps> = ({ 
  messages, 
  isExpanded: defaultExpanded = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  if (!messages.length) return null;
  
  const firstMessage = messages[0];
  const threadMessages = isExpanded ? messages : [firstMessage];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {new Date(firstMessage.created_at).toLocaleDateString()}
        </span>
        {messages.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            {isExpanded ? 'Collapse' : `Show ${messages.length - 1} more`}
          </Button>
        )}
      </div>
      
      {threadMessages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message} 
        />
      ))}
    </div>
  );
};

export default MessageThread;
