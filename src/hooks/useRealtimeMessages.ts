
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatMessage } from '@/utils/messageFormatting';
import { playMessageSound } from '@/utils/sound';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Message } from '@/types/message';
import { useToast } from '@/hooks/use-toast';

export const useRealtimeMessages = (
  userId: string | null,
  sessionId: string | null,
  onNewMessage: (message: Message) => void,
) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { toast } = useToast();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const handleNewMessage = useCallback((newMessage: any) => {
    console.log('Processing new message:', newMessage);
    
    const formattedMessage = formatMessage(newMessage);
    onNewMessage(formattedMessage);
    
    const isIncoming = userId 
      ? newMessage.sender_id !== userId 
      : !newMessage.session_id || (newMessage.session_id !== sessionId);
      
    if (isIncoming) {
      console.log('Playing message sound for incoming message');
      playMessageSound();
      
      // Update message status to 'delivered' for incoming messages with retry logic
      const updateMessageStatus = async (retryCount = 0) => {
        if (formattedMessage.message_status === 'sent') {
          const { error } = await supabase
            .rpc('update_message_status', { 
              message_id: formattedMessage.id, 
              new_status: 'delivered'
            });

          if (error) {
            console.error('Error updating message status:', error);
            if (retryCount < 3) {
              retryTimeoutRef.current = setTimeout(() => {
                updateMessageStatus(retryCount + 1);
              }, Math.pow(2, retryCount) * 1000); // Exponential backoff
            } else {
              toast({
                title: "Message Status Update Failed",
                description: "Could not update message status. Please check your connection.",
                variant: "destructive",
              });
            }
          }
        }
      };

      updateMessageStatus();
    }
  }, [userId, sessionId, onNewMessage, toast]);

  useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    const setupSubscription = async () => {
      if (channelRef.current) {
        console.log('Cleaning up existing subscription');
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const identifier = userId || sessionId;
      if (!identifier) {
        console.log('No identifier available for subscription');
        return;
      }

      const channelName = `messages:${identifier}:${Date.now()}`;
      console.log(`Setting up new subscription on channel: ${channelName}`);

      try {
        const channel = supabase
          .channel(channelName)
          .on('postgres_changes', 
            { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'messages'
            },
            (payload) => {
              console.log('New message received:', payload);
              handleNewMessage(payload.new);
            }
          )
          .on('postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
              filter: `message_status=in.(delivered,read)`
            },
            (payload) => {
              console.log('Message status updated:', payload);
              const updatedMessage = formatMessage(payload.new);
              onNewMessage(updatedMessage);
            }
          )
          .subscribe((status) => {
            console.log(`Subscription status for ${channelName}:`, status);
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to channel');
              toast({
                title: "Connected",
                description: "Real-time updates are now active",
              });
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.error(`Channel ${status}:`, channelName);
              toast({
                title: "Connection Lost",
                description: "Attempting to reconnect...",
                variant: "destructive",
              });
              setupSubscription();
            }
          });

        channelRef.current = channel;
        subscription = channel;
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
        toast({
          title: "Connection Error",
          description: "Failed to establish real-time connection",
          variant: "destructive",
        });
      }
    };

    setupSubscription();

    return () => {
      console.log('Cleaning up realtime subscription');
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (subscription) {
        supabase.removeChannel(subscription)
          .then(() => console.log('Successfully cleaned up subscription'))
          .catch(err => console.error('Error cleaning up subscription:', err));
      }
    };
  }, [userId, sessionId, handleNewMessage, toast]);
};
