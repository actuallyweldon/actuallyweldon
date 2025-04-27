
import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import ConversationList from './ConversationList';
import ConversationView from './ConversationView';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const AdminLayout = () => {
  const isMobile = useIsMobile();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { user, isAdmin, signOut } = useSupabaseAuth();

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleBack = () => {
    setSelectedUserId(null);
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black">
        <div className="h-full">
          {!selectedUserId ? (
            <ConversationList 
              onSelectUser={handleSelectUser}
              user={user}
              isAdmin={isAdmin}
              onSignOut={signOut}
            />
          ) : (
            <ConversationView 
              userId={selectedUserId} 
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <div className="grid h-full grid-cols-[300px_1fr]">
        <div className="border-r border-gray-800">
          <ConversationList 
            onSelectUser={handleSelectUser}
            user={user}
            isAdmin={isAdmin}
            onSignOut={signOut}
          />
        </div>
        <div>
          {selectedUserId ? (
            <ConversationView userId={selectedUserId} />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
