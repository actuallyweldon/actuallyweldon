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
  const { user, signIn, signUp, signOut } = useSupabaseAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
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
      setIsLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel('public:messages')
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
  }, [user?.id]);

  const handleSendMessage = async (content: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to send messages",
        variant: "destructive"
      });
      setIsAuthModalOpen(true);
      return;
    }

    const newMessage = {
      id: uuidv4(),
      content,
      sender_id: user.id,
      is_admin: false,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('messages').insert(newMessage);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      return;
    }

    setTimeout(async () => {
      const adminResponse = {
        id: uuidv4(),
        content: getRandomAdminResponse(),
        sender_id: user.id,
        is_admin: true,
        created_at: new Date().toISOString(),
      };

      await supabase.from('messages').insert(adminResponse);
    }, Math.random() * 2000 + 500);
  };

  const getRandomAdminResponse = () => {
    const responses = [
      "I'll get back to you soon.",
      "Thanks for reaching out.",
      "I'm currently away from my phone.",
      "I'll respond when I can.",
      "Got your message!",
      "I appreciate your message.",
      "I'll check this out.",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  return (
    <div className="flex flex-col h-screen bg-imessage-background">
      <ChatHeader 
        onAuthClick={() => setIsAuthModalOpen(true)} 
        isAuthenticated={!!user}
        onSignOut={signOut}
      />
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput onSendMessage={handleSendMessage} />
      
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
