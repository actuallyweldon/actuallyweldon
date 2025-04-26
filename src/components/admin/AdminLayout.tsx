
import React, { useState } from 'react';
import { useMediaQuery } from '@/hooks/use-mobile';
import ConversationList from './ConversationList';
import ConversationView from './ConversationView';
import { Message } from '@/types/message';

const AdminLayout = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleBack = () => {
    setSelectedUserId(null);
  };

  if (isMobile) {
    return (
      <div className="h-screen bg-black">
        {!selectedUserId ? (
          <ConversationList onSelectUser={handleSelectUser} />
        ) : (
          <ConversationView 
            userId={selectedUserId} 
            onBack={handleBack}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black">
      <div className="w-[30%] border-r border-gray-800">
        <ConversationList onSelectUser={handleSelectUser} />
      </div>
      <div className="flex-1">
        {selectedUserId ? (
          <ConversationView userId={selectedUserId} />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLayout;
