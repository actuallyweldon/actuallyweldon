import { useState, useEffect } from 'react';
import { Message } from '@/types/message';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useRealtimeMessages } from './useRealtimeMessages';
import { useTypingIndicators } from './useTypingIndicators';
import { formatMessage } from '@/utils/messageFormatting';
import { groupMessagesByThread } from '@/utils/messageThreading';

export const useMessages = (userId: string | null, sessionId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const addNewMessage = (message: Message) => {
    setMessages((current) => [...current, message]);
  };

  useRealtimeMessages(userId, sessionId, addNewMessage);
  const { setTypingStatus, typingUsers } = useTypingIndicators(userId, sessionId);

  const markMessagesAsRead = async (messageIds: string[]) => {
    try {
      for (const messageId of messageIds) {
        await supabase.rpc('update_message_status', { 
          message_id: messageId, 
          new_status: 'read' as const 
        });
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      if (!userId && !sessionId) {
        console.log('No userId or sessionId provided, skipping fetch');
        setIsLoading(false);
        return;
      }
      
      try {
        setError(null);
        let query = supabase.from('messages')
          .select('*')
          .order('created_at', { ascending: true });
        
        // No need for explicit filtering as RLS policies will handle this
        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw new Error(`Error fetching messages: ${fetchError.message}`);
        }

        const formattedMessages = (data || []).map(formatMessage);
        
        // Group messages by thread for possible future use
        const threadedMessages = groupMessagesByThread(formattedMessages);
        console.log('Messages grouped by thread:', threadedMessages);
        
        setMessages(formattedMessages);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error processing messages:', errorMessage);
        setError(new Error(errorMessage));
        toast({
          title: "Error Loading Messages",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [userId, sessionId, toast]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) {
      console.log('Trying to send empty message, ignoring');
      return false;
    }
    
    try {
      if (!userId && !sessionId) {
        throw new Error('No user ID or session ID available');
      }
      
      const newMessage = {
        content,
        sender_id: userId || null,
        is_admin: false,
        recipient_id: null,
        session_id: userId ? null : sessionId,
        message_status: 'sent' as const
      };

      const { error } = await supabase.from('messages').insert(newMessage);

      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error sending message:', errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  };

  return { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    setTypingStatus, 
    typingUsers,
    markMessagesAsRead
  };
};
