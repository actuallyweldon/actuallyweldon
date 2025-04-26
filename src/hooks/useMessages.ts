
import { useState, useEffect } from 'react';
import { Message } from '@/types/message';
import { supabase } from '@/integrations/supabase/client';
import { playMessageSound } from '../utils/sound';

export const useMessages = (userId: string | null, sessionId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!sessionId && !userId) {
      setIsLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        setError(null);
        const query = supabase
          .from('messages')
          .select('*');

        if (userId) {
          query.or(`sender_id.eq.${userId},and(is_admin.eq.true,recipient_id.eq.${userId})`);
        } else {
          query.eq('session_id', sessionId);
        }

        const { data, error: fetchError } = await query.order('created_at', { ascending: true });

        if (fetchError) {
          throw new Error('Error fetching messages');
        }

        const formattedMessages = (data || []).map((msg): Message => ({
          ...msg,
          sender: msg.is_admin ? 'admin' : 'user',
          timestamp: msg.created_at,
        }));

        setMessages(formattedMessages);
      } catch (err) {
        console.error('Error processing messages:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
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
          
          if (userId && newMessage.sender_id === userId || 
              !userId && newMessage.session_id === sessionId ||
              newMessage.is_admin && (!newMessage.recipient_id || (userId && newMessage.recipient_id === userId))) {
            
            const formattedMessage: Message = {
              ...newMessage,
              sender: newMessage.is_admin ? 'admin' : 'user',
              timestamp: newMessage.created_at
            };
            
            setMessages((current) => [...current, formattedMessage]);
            if (newMessage.sender_id !== userId) {
              playMessageSound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, sessionId]);

  const sendMessage = async (content: string) => {
    try {
      const newMessage = {
        content,
        sender_id: userId || null,
        is_admin: false,
        recipient_id: null,
        session_id: userId ? null : sessionId
      };

      const { error } = await supabase.from('messages').insert(newMessage);

      if (error) {
        console.error('Error sending message:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Unexpected error:', error);
      return false;
    }
  };

  return { messages, isLoading, error, sendMessage };
};
