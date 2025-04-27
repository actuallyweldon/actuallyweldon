
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
    
    // RLS policies will handle message visibility, so we can simplify our checks
    const formattedMessage = formatMessage(newMessage);
    onNewMessage(formattedMessage);
    
    const isIncoming = userId 
      ? newMessage.sender_id !== userId 
      : !newMessage.session_id || (newMessage.session_id !== sessionId);
      
    if (isIncoming) {
      console.log('Playing message sound for incoming message');
      playMessageSound();
      
      // Update message status to 'delivered' for incoming messages
      if (formattedMessage.message_status === 'sent') {
        supabase
          .from('messages')
          .update({ message_status: 'delivered' })
          .eq('id', formattedMessage.id)
          .then(({ error }) => {
            if (error) {
              console.error('Error updating message status:', error);
            }
          });
      }
    }
  }, [userId, sessionId, onNewMessage]);

  useEffect(() => {
    // Clean up previous channel if it exists
    if (channelRef.current) {
      console.log('Cleaning up previous message channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

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
