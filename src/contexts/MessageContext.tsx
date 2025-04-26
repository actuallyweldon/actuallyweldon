
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Message } from '@/types/message';
import { messagesService } from '@/services/messages';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';
import { playMessageSound } from '@/utils/sound';

interface MessageContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  setIsAuthModalOpen: (isOpen: boolean) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useSupabaseAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;

    const fetchMessages = async () => {
      try {
        const fetchedMessages = await messagesService.fetchMessages();
        setMessages(fetchedMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: "Error",
          description: "Could not load messages",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    const unsubscribe = messagesService.subscribeToMessages((newMessage) => {
      setMessages((current) => [...current, newMessage]);
      if (newMessage.sender_id !== user?.id) {
        playMessageSound();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, authLoading, toast]);

  const handleSendMessage = async (content: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in or create an account to send messages",
      });
      return;
    }

    try {
      await messagesService.sendMessage(content, user);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error.message?.includes('row-level-security')
        ? 'Permission denied. Please try logging out and back in.'
        : 'An unexpected error occurred';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return (
    <MessageContext.Provider value={{
      messages,
      isLoading: isLoading || authLoading,
      sendMessage: handleSendMessage,
      setIsAuthModalOpen: () => {} // This will be passed down from Index.tsx
    }}>
      {children}
    </MessageProvider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};
