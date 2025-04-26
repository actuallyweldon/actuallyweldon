
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
          // For authenticated users, show their messages and admin responses
          query.or(`sender_id.eq.${userId},and(is_admin.eq.true,recipient_id.eq.${userId})`);
        } else if (sessionId) {
          // For anonymous users, only show messages from their session
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

    // Set up real-time listener for new messages
    const channel = supabase
      .channel('public-messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Check if the message belongs to the current user/session
          if (userId && (newMessage.sender_id === userId || 
              (newMessage.is_admin && (!newMessage.recipient_id || newMessage.recipient_id === userId)))) {
            addNewMessage(newMessage);
          } else if (!userId && newMessage.session_id === sessionId) {
            addNewMessage(newMessage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, sessionId]);

  const addNewMessage = (newMessage: any) => {
    const formattedMessage: Message = {
      ...newMessage,
      sender: newMessage.is_admin ? 'admin' : 'user',
      timestamp: newMessage.created_at
    };
    
    setMessages((current) => [...current, formattedMessage]);
    
    // Play sound for incoming messages from others
    if (newMessage.sender_id !== userId) {
      playMessageSound();
    }
  };

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
