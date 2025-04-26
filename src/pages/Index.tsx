
import React, { useState } from 'react';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import AuthModal from '../components/AuthModal';
import { MessageProvider, useMessages } from '@/contexts/MessageContext';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { initAudio } from '../utils/sound';

const ChatComponent = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, signIn, signUp, signOut, isAdmin } = useSupabaseAuth();
  const { messages, isLoading, sendMessage } = useMessages();

  // Initialize audio on first user interaction
  React.useEffect(() => {
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
    };
    document.addEventListener('click', handleUserInteraction);
    return () => {
      document.removeEventListener('click', handleUserInteraction);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-imessage-background">
      <ChatHeader 
        onAuthClick={() => setIsAuthModalOpen(true)} 
        isAuthenticated={!!user}
        isAdmin={isAdmin}
        onSignOut={signOut}
        email={user?.email}
      />
      <MessageList 
        messages={user ? messages.filter(m => m.sender_id === user.id) : []} 
        isLoading={isLoading} 
      />
      <MessageInput 
        onSendMessage={sendMessage}
        disabled={isLoading} 
      />
      
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={signIn}
        onSignUp={signUp}
      />
    </div>
  );
};

const Index = () => (
  <MessageProvider>
    <ChatComponent />
  </MessageProvider>
);

export default Index;
