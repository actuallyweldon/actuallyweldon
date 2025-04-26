
import React, { useState, useEffect } from 'react';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import AuthModal from '../components/AuthModal';
import { Message } from '@/types/message';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useAnonymousSession } from '@/hooks/useAnonymousSession';
import { supabase } from '@/integrations/supabase/client';
import { initAudio, playMessageSound } from '../utils/sound';

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, loading: authLoading, signIn, signUp, signOut, isAdmin } = useSupabaseAuth();
  const { sessionId } = useAnonymousSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !sessionId) return;

    const fetchMessages = async () => {
      try {
        const query = supabase
          .from('messages')
          .select('*');

        if (user) {
          // If authenticated, get user's messages and admin messages to them
          query.or(`sender_id.eq.${user.id},and(is_admin.eq.true,recipient_id.eq.${user.id})`);
        } else {
          // If anonymous, get messages for this session
          query.eq('session_id', sessionId);
        }

        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        const formattedMessages = (data || []).map((msg): Message => ({
          ...msg,
          sender: msg.is_admin ? 'admin' : 'user',
          timestamp: msg.created_at,
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error processing messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('public-messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Only add message if it belongs to current user/session
          if (user && newMessage.sender_id === user.id || 
              !user && newMessage.session_id === sessionId ||
              newMessage.is_admin && (!newMessage.recipient_id || (user && newMessage.recipient_id === user.id))) {
            
            const formattedMessage: Message = {
              ...newMessage,
              sender: newMessage.is_admin ? 'admin' : 'user',
              timestamp: newMessage.created_at
            };
            
            setMessages((current) => [...current, formattedMessage]);
            if (newMessage.sender_id !== user?.id) {
              playMessageSound();
            }
          }
        }
      )
      .subscribe();

    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
    };
    document.addEventListener('click', handleUserInteraction);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [user?.id, authLoading, sessionId]);

  const handleSendMessage = async (content: string) => {
    try {
      const newMessage = {
        content,
        sender_id: user?.id || null,
        is_admin: false,
        recipient_id: null,
        session_id: user ? null : sessionId
      };

      const { error } = await supabase.from('messages').insert(newMessage);

      if (error) {
        console.error('Error sending message:', error);
        
        if (error.code === '42501' || error.message.includes('policy')) {
          setIsAuthModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden bg-imessage-background">
      <ChatHeader 
        onAuthClick={() => setIsAuthModalOpen(true)} 
        isAuthenticated={!!user}
        isAdmin={isAdmin}
        onSignOut={signOut}
        email={user?.email}
      />
      <MessageList 
        messages={messages}
        isLoading={isLoading || authLoading} 
      />
      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={authLoading || !sessionId} 
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
