import React, { useState, useEffect } from 'react';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import AuthModal from '../components/AuthModal';
import { Message } from '@/types/message';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { initAudio, playMessageSound } from '../utils/sound';

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, loading: authLoading, signIn, signUp, signOut, isAdmin } = useSupabaseAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user?.id},and(is_admin.eq.true,recipient_id.eq.${user?.id})`)
          .order('created_at', { ascending: true });

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
  }, [user?.id, authLoading]);

  const handleSendMessage = async (content: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      console.log('Authentication required to send messages');
      return;
    }

    try {
      const newMessage = {
        content,
        sender_id: user.id,
        is_admin: false,
        recipient_id: null
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
    <div className="flex flex-col h-screen bg-imessage-background">
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
        disabled={authLoading} 
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
