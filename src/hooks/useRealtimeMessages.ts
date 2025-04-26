
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
    const formattedMessage = formatMessage(newMessage);
    onNewMessage(formattedMessage);
    
    if (newMessage.sender_id !== userId) {
      console.log('Playing message sound for incoming message');
      playMessageSound();
    }
  }, [userId, onNewMessage]);

  useEffect(() => {
    if (!sessionId && !userId) return;

    console.log('Setting up real-time listener');
    const channel = supabase
      .channel('public-messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as any;
          
          if (userId && (newMessage.sender_id === userId || 
              (newMessage.is_admin && (!newMessage.recipient_id || newMessage.recipient_id === userId)))) {
            console.log('Adding new message for authenticated user');
            handleNewMessage(newMessage);
          } else if (!userId && newMessage.session_id === sessionId) {
            console.log('Adding new message for anonymous session');
            handleNewMessage(newMessage);
          }
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
