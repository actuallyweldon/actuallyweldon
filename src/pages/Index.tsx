
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatHeader from '../components/ChatHeader';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import AuthModal from '../components/AuthModal';
import { Message } from '@/types/message';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { initAudio, playMessageSound } from '../utils/sound';

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, loading: authLoading, signIn, signUp, signOut, isAdmin } = useSupabaseAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching messages:', error);
          toast({
            title: "Error",
            description: "Could not load messages",
            variant: "destructive"
          });
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
        toast({
          title: "Error",
          description: "Could not process messages",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Set up realtime subscription for new messages
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

    // Initialize audio on first user interaction
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
    };
    document.addEventListener('click', handleUserInteraction);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [user?.id, authLoading, toast]);

  const handleSendMessage = async (content: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      toast({
        title: "Authentication Required",
        description: "Please sign in or create an account to send messages",
      });
      return;
    }

    console.log('Attempting to send message with user:', user.id);

    try {
      const newMessage = {
        content,
        sender_id: user.id,
        is_admin: false,
        recipient_id: null  // User messages don't need a recipient_id
      };

      console.log('Sending message:', newMessage);
      const { data, error } = await supabase.from('messages').insert(newMessage);

      if (error) {
        console.error('Error details:', error);
        let errorMessage = 'Failed to send message';
        
        if (error.message.includes('row-level-security')) {
          errorMessage = 'Permission denied. Please try logging out and back in.';
        }

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });

        // If we detect an auth error, we can prompt the user to re-authenticate
        if (error.code === '42501' || error.message.includes('policy')) {
          setIsAuthModalOpen(true);
        }
      } else {
        console.log('Message sent successfully:', data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
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
        messages={user ? messages.filter(m => m.sender_id === user.id) : []} 
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
