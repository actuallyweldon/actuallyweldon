
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

  // Mobile layout with conditional rendering
  if (isMobile) {
    return (
      <div className="h-screen w-screen bg-black overflow-hidden">
        <div className="relative h-full transition-transform duration-300 ease-in-out">
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

  // Desktop layout with CSS Grid
  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      <div className="grid h-full" style={{ gridTemplateColumns: 'minmax(300px, 25%) 1fr' }}>
        <div className="overflow-hidden border-r border-gray-800">
          <ConversationList 
            onSelectUser={handleSelectUser}
            user={user}
            isAdmin={isAdmin}
            onSignOut={signOut}
          />
        </div>
        <div className="overflow-hidden">
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
