
import React from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ConversationItemProps {
  senderId: string;
  lastMessage: string;
  createdAt: string;
  userInfo?: {
    username?: string;
  };
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  senderId,
  lastMessage,
  createdAt,
  userInfo,
  onClick,
}) => {
  const getUserDisplayName = () => {
    if (userInfo?.username) {
      return userInfo.username;
    }
    return `User ${senderId.slice(0, 8)}`;
  };

  const getAvatarLetters = () => {
    if (userInfo?.username) {
      return userInfo.username.slice(0, 2).toUpperCase();
    }
    return senderId.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className="p-4 border-b border-gray-800 hover:bg-gray-900 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <Avatar>
          <AvatarFallback>{getAvatarLetters()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {getUserDisplayName()}
          </p>
          <p className="text-sm text-gray-400 truncate">{lastMessage}</p>
        </div>
        <div className="text-xs text-gray-500">
          {format(new Date(createdAt), 'MMM d, h:mm a')}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
