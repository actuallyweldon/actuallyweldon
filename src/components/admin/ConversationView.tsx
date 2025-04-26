
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import MessageList from '../MessageList';
import MessageInput from '../MessageInput';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-mobile';

interface ConversationViewProps {
  userId: string;
  onBack?: () => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ userId, onBack }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b border-gray-800">
        {isMobile && onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-white"
            onClick={onBack}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        )}
        <div>
          <h2 className="text-lg font-semibold text-white">
            Chat with User {userId.slice(0, 8)}
          </h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <MessageList targetUserId={userId} />
      </div>
      <MessageInput onSendMessage={(content) => {
        // Handle sending message as admin
        console.log('Sending message to user:', userId, content);
      }} />
    </div>
  );
};

export default ConversationView;
