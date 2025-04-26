
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2, AlertCircle } from 'lucide-react';
import MessageList from '../MessageList';
import MessageInput from '../MessageInput';
import ConversationHeader from './ConversationHeader';
import { useConversation } from '@/hooks/useConversation';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    isUserTyping,
    errors,
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
        isTyping={isUserTyping}
        onBack={onBack}
        showBackButton={isMobile}
      />
      
      {connectionStatus === 'disconnected' && (
        <Alert variant="destructive" className="m-2 py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Connection lost. Reconnecting...
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>
      
      <MessageInput 
        onSendMessage={handleSendMessage} 
        disabled={connectionStatus === 'disconnected'}
      />
    </div>
  );
};

export default ConversationView;
