
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/hooks/useConversation';
import ConnectionStatusIndicator from './ConnectionStatus';

interface ConversationHeaderProps {
  username: string;
  connectionStatus: ConnectionStatus;
  onBack?: () => void;
  showBackButton?: boolean;
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  username,
  connectionStatus,
  onBack,
  showBackButton
}) => {
  return (
    <div className="flex items-center p-4 border-b border-gray-800">
      {showBackButton && onBack && (
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 text-white"
          onClick={onBack}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      )}
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-white">
          Chat with {username}
        </h2>
        <ConnectionStatusIndicator status={connectionStatus} />
      </div>
    </div>
  );
};

export default ConversationHeader;
