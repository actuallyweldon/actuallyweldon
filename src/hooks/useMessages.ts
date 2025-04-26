
import { useState } from 'react';
import { Message } from '@/types/message';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useRealtimeMessages } from './useRealtimeMessages';
import { useTypingIndicators } from './useTypingIndicators';
import { formatMessage } from '@/utils/messageFormatting';

export const useMessages = (userId: string | null, sessionId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useRealtimeMessages(userId, sessionId, (message) => {
    setMessages((current) => [...current, message]);
  });

  const { setTypingStatus, typingUsers } = useTypingIndicators(userId, sessionId);

  // Fetch initial messages
  useState(() => {
    if (!sessionId && !userId) {
      console.log('No session or user ID provided, skipping messages fetch');
      setIsLoading(false);
      return;
    }

    const fetchMessages = async () => {
      console.log('Fetching messages for:', { userId, sessionId });
      try {
        setError(null);
        const query = supabase
          .from('messages')
          .select('*');

        if (userId) {
          console.log('Fetching messages for authenticated user:', userId);
          query.or(`sender_id.eq.${userId},and(is_admin.eq.true,recipient_id.eq.${userId})`);
        } else if (sessionId) {
          console.log('Fetching messages for anonymous session:', sessionId);
          query.eq('session_id', sessionId);
        }

        const { data, error: fetchError } = await query.order('created_at', { ascending: true });

        if (fetchError) {
          console.error('Error fetching messages:', fetchError);
          throw new Error('Error fetching messages');
        }

        console.log('Fetched messages:', data?.length || 0);
        const formattedMessages = (data || []).map(formatMessage);
        setMessages(formattedMessages);
      } catch (err) {
        console.error('Error processing messages:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [userId, sessionId]);

  const sendMessage = async (content: string) => {
    console.log('Attempting to send message:', { content, userId, sessionId });
    try {
      const newMessage = {
        content,
        sender_id: userId || sessionId,
        is_admin: false,
        recipient_id: null,
        session_id: userId ? null : sessionId
      };

      console.log('Sending message payload:', newMessage);
      const { error } = await supabase.from('messages').insert(newMessage);

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
        return false;
      }
      
      console.log('Message sent successfully');
      return true;
    } catch (error) {
      console.error('Unexpected error sending message:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
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
    typingUsers 
  };
};
