
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Conversation } from '@/types/conversation';

interface ConversationItemProps {
  conversation: Conversation;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onClick,
}) => {
  const { sender_id, last_message, last_message_timestamp, user_info, unread_count, is_typing } = conversation;
  
  const getUserDisplayName = () => {
    if (user_info?.username) {
      return user_info.username;
    }
    return `User ${sender_id.slice(0, 8)}`;
  };

  const getAvatarLetters = () => {
    if (user_info?.username) {
      return user_info.username.slice(0, 2).toUpperCase();
    }
    return sender_id.slice(0, 2).toUpperCase();
  };

  return (
    <div
      className={`p-4 border-b border-gray-800 hover:bg-gray-900 cursor-pointer ${unread_count ? 'bg-gray-900/50' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <Avatar>
          {user_info?.avatar_url ? (
            <AvatarImage src={user_info.avatar_url} alt={getUserDisplayName()} />
          ) : (
            <AvatarFallback>{getAvatarLetters()}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <p className={`text-sm font-medium ${unread_count ? 'text-white font-semibold' : 'text-gray-300'} truncate`}>
              {getUserDisplayName()}
            </p>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(last_message_timestamp), { addSuffix: true })}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <p className={`text-sm ${unread_count ? 'text-gray-200' : 'text-gray-400'} truncate`}>
              {is_typing ? (
                <span className="text-green-400">typing...</span>
              ) : (
                last_message
              )}
            </p>
            {!!unread_count && (
              <Badge variant="default" className="bg-blue-600 text-white text-xs">
                {unread_count}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
