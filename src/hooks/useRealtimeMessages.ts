
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatMessage } from '@/utils/messageFormatting';
import { playMessageSound } from '@/utils/sound';

export const useRealtimeMessages = (
  userId: string | null,
  sessionId: string | null,
  onNewMessage: (message: any) => void
) => {
  const channelRef = useRef<any>(null);

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

    // Clean up previous channel if it exists
    if (channelRef.current) {
      console.log('Cleaning up previous message channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a unique channel name for each user/session
    const channelName = `messages-${userId || sessionId}-${Date.now()}`;
    console.log('Setting up real-time listener:', { userId, sessionId, channelName });
    
    channelRef.current = supabase
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
      console.log(`Cleaning up message channel: ${channelName}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, sessionId, handleNewMessage]);
};
