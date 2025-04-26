
import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatMessage } from '@/utils/messageFormatting';
import { playMessageSound } from '@/utils/sound';

export const useRealtimeMessages = (
  userId: string | null,
  sessionId: string | null,
  onNewMessage: (message: any) => void
) => {
  const handleNewMessage = useCallback((newMessage: any) => {
    console.log('Processing new message:', newMessage);

    // Check if this message is relevant for the current user/session
    const isRelevant = userId 
      ? (newMessage.sender_id === userId || 
         (newMessage.is_admin && newMessage.recipient_id === userId))
      : (newMessage.session_id === sessionId || 
         (newMessage.is_admin && newMessage.recipient_id === sessionId));

    if (!isRelevant) {
      console.log('Message not relevant for current user/session');
      return;
    }

    console.log('Message is relevant, formatting and adding to state');
    const formattedMessage = formatMessage(newMessage);
    onNewMessage(formattedMessage);
    
    if (newMessage.sender_id !== userId) {
      console.log('Playing message sound for incoming message');
      playMessageSound();
    }
  }, [userId, sessionId, onNewMessage]);

  useEffect(() => {
    if (!sessionId && !userId) return;

    console.log('Setting up real-time listener for:', { userId, sessionId });
    const channel = supabase
      .channel('public-messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as any;
          handleNewMessage(newMessage);
        }
      )
      .subscribe((status) => {
        console.log('Channel subscription status:', status);
      });

    return () => {
      console.log('Cleaning up message listener');
      supabase.removeChannel(channel);
    };
  }, [userId, sessionId, handleNewMessage]);
};
