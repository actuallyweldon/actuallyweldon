
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
    
    if (!userId && !sessionId) {
      console.log('No user ID or session ID available, ignoring message');
      return;
    }

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
    
    const isIncoming = userId 
      ? newMessage.sender_id !== userId 
      : !newMessage.session_id || (newMessage.session_id !== sessionId);
      
    if (isIncoming) {
      console.log('Playing message sound for incoming message');
      playMessageSound();
    }
  }, [userId, sessionId, onNewMessage]);

  useEffect(() => {
    if (!sessionId && !userId) {
      console.log('No user ID or session ID available, not setting up listener');
      return;
    }

    // Create a unique channel name for each user/session
    const channelName = `messages-${userId || sessionId}`;
    console.log('Setting up real-time listener:', { userId, sessionId, channelName });
    
    const channel = supabase
      .channel(channelName)
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
