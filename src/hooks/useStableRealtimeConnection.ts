
import { useRef, useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * A custom hook for managing stable realtime connections with Supabase
 * that handles reconnections and proper cleanup
 */
export function useStableRealtimeConnection(
  channelName: string,
  handlers: {
    onInsert?: (payload: any) => void;
    onUpdate?: (payload: any) => void;
    onDelete?: (payload: any) => void;
    onSubscribe?: (status: string) => void;
  },
  tableConfig: {
    table: string;
    schema?: string;
    filter?: string;
  },
  enabled: boolean = true
) {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const attemptsRef = useRef(0);
  const maxAttempts = 5;
  const reconnectDelay = 2000;
  const uniqueChannelName = `${channelName}-${Date.now()}`;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (!enabled) return;

    const setupChannel = () => {
      // Clean up existing channel if it exists
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
          .then(() => console.log('Previous channel removed'))
          .catch(err => console.error('Error removing channel:', err));
        channelRef.current = null;
      }

      console.log(`Setting up realtime channel: ${uniqueChannelName}`);
      const schema = tableConfig.schema || 'public';

      try {
        const channel = supabase.channel(uniqueChannelName);
        
        // Set up INSERT handler
        if (handlers.onInsert) {
          channel.on('postgres_changes', 
            { 
              event: 'INSERT', 
              schema: schema, 
              table: tableConfig.table,
              filter: tableConfig.filter 
            },
            (payload) => handlers.onInsert!(payload)
          );
        }
        
        // Set up UPDATE handler
        if (handlers.onUpdate) {
          channel.on('postgres_changes', 
            { 
              event: 'UPDATE', 
              schema: schema, 
              table: tableConfig.table,
              filter: tableConfig.filter
            },
            (payload) => handlers.onUpdate!(payload)
          );
        }
        
        // Set up DELETE handler
        if (handlers.onDelete) {
          channel.on('postgres_changes', 
            { 
              event: 'DELETE', 
              schema: schema, 
              table: tableConfig.table,
              filter: tableConfig.filter 
            },
            (payload) => handlers.onDelete!(payload)
          );
        }
        
        // Subscribe to the channel
        channel.subscribe((status) => {
          console.log(`Supabase channel status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            attemptsRef.current = 0;
            if (handlers.onSubscribe) {
              handlers.onSubscribe(status);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (attemptsRef.current < maxAttempts) {
              attemptsRef.current++;
              toast({
                title: "Connection error",
                description: `Attempting to reconnect (${attemptsRef.current}/${maxAttempts})...`,
                variant: "destructive",
              });

              timeoutId = setTimeout(() => {
                setupChannel();
              }, reconnectDelay);
            } else {
              toast({
                title: "Connection failed",
                description: "Could not establish a stable connection after multiple attempts.",
                variant: "destructive",
              });
            }
          }
        });
        
        channelRef.current = channel;
      } catch (error) {
        console.error('Error setting up channel:', error);
        toast({
          title: "Connection Error",
          description: "Failed to set up realtime connection",
          variant: "destructive",
        });
      }
    };
    
    setupChannel();
    
    // Cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
          .then(() => console.log(`Channel ${uniqueChannelName} removed successfully`))
          .catch(err => console.error(`Error removing channel ${uniqueChannelName}:`, err));
      }
    };
  }, [enabled, channelName, tableConfig.table, tableConfig.filter, tableConfig.schema]);

  return {
    isConnected: channelRef.current !== null,
  };
}
