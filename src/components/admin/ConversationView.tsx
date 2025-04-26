
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import MessageList from '../MessageList';
import MessageInput from '../MessageInput';
import ConversationHeader from './ConversationHeader';
import { useConversation } from '@/hooks/useConversation';

interface ConversationViewProps {
  userId: string;
  onBack?: () => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ userId, onBack }) => {
  const isMobile = useIsMobile();
  const {
    messages,
    loading,
    userInfo,
    connectionStatus,
    handleSendMessage
  } = useConversation(userId);

  const getUserDisplayName = () => {
    if (userInfo.username) {
      return userInfo.username;
    }
    return `User ${userId.slice(0, 8)}`;
  };

  return (
    <div className="flex flex-col h-full">
      <ConversationHeader
        username={getUserDisplayName()}
        connectionStatus={connectionStatus}
        onBack={onBack}
        showBackButton={isMobile}
      />
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ConversationView;
