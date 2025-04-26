
import React, { useState } from 'react';
import ChatHeader from '../components/ChatHeader';
import ChatInterface from '../components/ChatInterface';
import AuthModal from '../components/AuthModal';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useAnonymousSession } from '@/hooks/useAnonymousSession';
import { initAudio } from '../utils/sound';

const Index = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, loading: authLoading, signIn, signUp, signOut, isAdmin } = useSupabaseAuth();
  const { sessionId } = useAnonymousSession();

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-imessage-background">
      <ChatHeader 
        onAuthClick={() => setIsAuthModalOpen(true)} 
        isAuthenticated={!!user}
        isAdmin={isAdmin}
        onSignOut={signOut}
        email={user?.email}
      />
      
      <ChatInterface
        userId={user?.id || null}
        sessionId={sessionId}
        onAuthRequired={() => setIsAuthModalOpen(true)}
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

export default Index;
