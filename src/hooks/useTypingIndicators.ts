
import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TypingIndicator } from '@/types/message';

export const useTypingIndicators = (userId: string | null, sessionId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const isInitializedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!sessionId && !userId) return;
    
    // Don't re-initialize if already setup with same parameters
    if (isInitializedRef.current) return;
    
    // Clean up reconnection timeout if it exists
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    // Clean up previous channel if it exists
    if (channelRef.current) {
      console.log('Cleaning up previous typing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
    
    // Create channel with stable ID-based name instead of timestamp
    const identifier = userId || sessionId;
    const channelName = `typing-${identifier}`;
    console.log(`Creating typing channel: ${channelName}`);
    
    channelRef.current = supabase.channel(channelName);
    
    channelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current.presenceState();
        const typingData: TypingIndicator[] = [];
        
        console.log('Typing channel state:', state);
        
        Object.keys(state).forEach(key => {
          state[key].forEach((presence: any) => {
            // Filter out stale typing indicators (older than 10 seconds)
            const lastTyped = new Date(presence.lastTyped);
            const now = new Date();
            const isStale = now.getTime() - lastTyped.getTime() > 10000;
            
            if (presence.isTyping && !isStale) {
              typingData.push({
                userId: presence.userId,
                sessionId: presence.sessionId,
                isTyping: presence.isTyping,
                lastTyped: new Date(presence.lastTyped)
              });
            }
          });
        });
        
        console.log('Updated typing data:', typingData);
        setTypingUsers(typingData);
      })
      .subscribe((status: string) => {
        console.log('Typing channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          isInitializedRef.current = true;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('Typing channel disconnected, will reconnect');
          isSubscribedRef.current = false;
          isInitializedRef.current = false;
          
          // Implement reconnection with backoff
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            isInitializedRef.current = false; // Allow reinitialization
          }, 2000);
        }
      });

    return () => {
      console.log(`Cleaning up typing channel: ${channelName}`);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
        isInitializedRef.current = false;
      }
    };
  }, [userId, sessionId]);

  // Debounced typing status to prevent excessive updates
  const setTypingStatus = useCallback((function() {
    let typingTimeout: NodeJS.Timeout | null = null;
    
    return function(isTyping: boolean) {
      if (!channelRef.current || !isSubscribedRef.current) {
        console.log('Cannot set typing status: channel not ready');
        return;
      }
      
      // Clear any existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
      }
      
      // If setting to typing, do it immediately. If setting to not typing, delay it
      if (isTyping) {
        console.log(`Setting typing status: ${isTyping}`);
        try {
          channelRef.current.track({
            userId: userId || undefined,
            sessionId: userId ? undefined : sessionId,
            isTyping,
            lastTyped: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error tracking typing status:', error);
        }
      } else {
        // Delay turning off typing status to prevent flicker when user is typing multiple messages
        typingTimeout = setTimeout(() => {
          console.log(`Setting typing status: ${isTyping} (delayed)`);
          try {
            channelRef.current.track({
              userId: userId || undefined,
              sessionId: userId ? undefined : sessionId,
              isTyping,
              lastTyped: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error tracking typing status:', error);
          }
        }, 1000);
      }
    };
  })(), [userId, sessionId]);

  const getTypingIndicator = useCallback(() => {
    const filteredTypingUsers = userId
      ? typingUsers.filter(user => user.userId !== userId && !user.sessionId)
      : typingUsers.filter(user => user.sessionId !== sessionId && !user.sessionId);
    
    // Filter out stale typing indicators (older than 10 seconds)
    const now = new Date();
    const freshTypingUsers = filteredTypingUsers.filter(user => {
      const lastTyped = new Date(user.lastTyped);
      return now.getTime() - lastTyped.getTime() < 10000;
    });
    
    console.log('Filtered typing users:', freshTypingUsers);
    return freshTypingUsers;
  }, [typingUsers, userId, sessionId]);

  return { setTypingStatus, typingUsers: getTypingIndicator() };
};
