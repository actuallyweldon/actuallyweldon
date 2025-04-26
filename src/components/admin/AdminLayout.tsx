
import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import ConversationList from './ConversationList';
import ConversationView from './ConversationView';
import ProfileDropdown from '../ProfileDropdown';
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
      <div className="h-screen bg-black">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h1 className="text-white text-lg font-semibold">Admin Dashboard</h1>
          <ProfileDropdown
            isAuthenticated={!!user}
            onAuthClick={() => {}}
            onSignOut={signOut}
            email={user?.email}
            isAdmin={isAdmin}
          />
        </div>
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
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h1 className="text-white text-lg font-semibold">Admin Dashboard</h1>
          <ProfileDropdown
            isAuthenticated={!!user}
            onAuthClick={() => {}}
            onSignOut={signOut}
            email={user?.email}
            isAdmin={isAdmin}
          />
        </div>
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
