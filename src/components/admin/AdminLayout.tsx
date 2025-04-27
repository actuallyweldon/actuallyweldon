
import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import ConversationList from './ConversationList';
import ConversationView from './ConversationView';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const AdminLayout = () => {
  const isMobile = useIsMobile();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { user, isAdmin, signOut } = useSupabaseAuth();
  const [showSidebar, setShowSidebar] = useState(true);

  // Reset layout when switching between mobile and desktop
  useEffect(() => {
    if (!isMobile) {
      setShowSidebar(true);
    }
  }, [isMobile]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    // On mobile, hide the sidebar when a user is selected
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleBack = () => {
    // On mobile, show the sidebar when going back
    if (isMobile) {
      setShowSidebar(true);
      setSelectedUserId(null);
    } else {
      setSelectedUserId(null);
    }
  };

  // Mobile layout with transition-based approach
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black">
        <div className="relative h-full w-full overflow-hidden">
          {/* Conversation list - hidden when a user is selected */}
          <div 
            className={`absolute inset-0 w-full h-full transition-transform duration-300 ${
              showSidebar ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <ConversationList 
              onSelectUser={handleSelectUser}
              user={user}
              isAdmin={isAdmin}
              onSignOut={signOut}
            />
          </div>
          
          {/* Conversation view - shown when a user is selected */}
          <div 
            className={`absolute inset-0 w-full h-full transition-transform duration-300 ${
              !showSidebar ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {selectedUserId && (
              <ConversationView 
                userId={selectedUserId} 
                onBack={handleBack}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout with fixed grid
  return (
    <div className="fixed inset-0 bg-black">
      <div 
        className="grid h-full w-full" 
        style={{ 
          gridTemplateColumns: selectedUserId ? 'minmax(300px, 25%) 1fr' : '1fr',
          gridTemplateRows: '1fr'
        }}
      >
        {/* Always show the conversation list on desktop */}
        <div className="h-full overflow-hidden border-r border-gray-800 min-w-[300px]">
          <ConversationList 
            onSelectUser={handleSelectUser}
            user={user}
            isAdmin={isAdmin}
            onSignOut={signOut}
          />
        </div>
        
        {/* Conversation view or placeholder */}
        <div className="h-full overflow-hidden">
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
