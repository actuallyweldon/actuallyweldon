
import React from 'react';
import { ArrowLeft, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import ConnectionStatus from './ConnectionStatus';

interface ConversationHeaderProps {
  onBack?: () => void;
  isMobile: boolean;
  userDisplayName: string;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  onBack,
  isMobile,
  userDisplayName,
  connectionStatus,
}) => {
  return (
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
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8 bg-gray-700">
          <AvatarFallback className="bg-gray-700 text-white">
            <UserRound className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <h2 className="text-lg font-semibold text-white">
          Chat with {userDisplayName}
        </h2>
        <ConnectionStatus status={connectionStatus} />
      </div>
    </div>
  );
};

export default ConversationHeader;
