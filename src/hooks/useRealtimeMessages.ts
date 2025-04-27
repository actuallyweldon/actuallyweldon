
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
  const isInitializedRef = useRef(false);
  const updateQueueRef = useRef<{id: string, status: 'sent' | 'delivered' | 'read'}[]>([]);
  const processingStatusUpdateRef = useRef(false);

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
      
      // Queue message status update instead of executing immediately
      if (formattedMessage.message_status === 'sent') {
        updateQueueRef.current.push({
          id: formattedMessage.id,
          status: 'delivered'
        });
        processStatusUpdateQueue();
      }
    }
  }, [userId, sessionId, onNewMessage]);

  // Process status updates in queue to prevent simultaneous updates
  const processStatusUpdateQueue = useCallback(async () => {
    if (processingStatusUpdateRef.current || updateQueueRef.current.length === 0) {
      return;
    }

    processingStatusUpdateRef.current = true;
    
    try {
      const update = updateQueueRef.current[0];
      const { error } = await supabase
        .rpc('update_message_status', { 
          message_id: update.id, 
          new_status: update.status
        });

      if (error) {
        console.error('Error updating message status:', error);
        // If failed, retry this same update after a delay
        setTimeout(() => {
          processingStatusUpdateRef.current = false;
          processStatusUpdateQueue();
        }, 2000);
        return;
      }
      
      // Remove the processed update from queue
      updateQueueRef.current.shift();
    } catch (err) {
      console.error('Error in status update processing:', err);
      toast({
        title: "Status Update Error",
        description: "Failed to update message status. Will retry shortly.",
        variant: "destructive",
      });
    } finally {
      processingStatusUpdateRef.current = false;
      
      // Process next item if available
      if (updateQueueRef.current.length > 0) {
        setTimeout(processStatusUpdateQueue, 300); // Small delay between operations
      }
    }
  }, [toast]);

  useEffect(() => {
    // Clean up any existing retries on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Skip if already initialized with same parameters or if we don't have an identifier
    const identifier = userId || sessionId;
    if (!identifier || isInitializedRef.current) {
      return;
    }

    const setupSubscription = () => {
      // Clean up existing channel if it exists
      if (channelRef.current) {
        console.log('Cleaning up existing subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Create a stable channel name based on user or session ID
      // Avoid using timestamps which create new channels on every render
      const channelName = `messages-${identifier}`;
      console.log(`Setting up subscription on channel: ${channelName}`);

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
              isInitializedRef.current = true;
              toast({
                title: "Connected",
                description: "Real-time updates are now active",
              });
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.error(`Channel ${status}:`, channelName);
              isInitializedRef.current = false;
              toast({
                title: "Connection Lost",
                description: "Attempting to reconnect...",
                variant: "destructive",
              });
              
              // Implement exponential backoff for reconnection attempts
              if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
              }
              
              retryTimeoutRef.current = setTimeout(() => {
                setupSubscription();
              }, 2000);
            }
          });

        channelRef.current = channel;
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
          .then(() => console.log('Successfully cleaned up subscription'))
          .catch(err => console.error('Error cleaning up subscription:', err));
      }
      isInitializedRef.current = false;
    };
  }, [userId, sessionId, handleNewMessage, toast]);
};
