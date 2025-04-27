
import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TypingIndicator } from '@/types/message';

export const useTypingIndicators = (userId: string | null, sessionId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!sessionId && !userId) return;
    
    // Clean up previous channel if it exists
    if (channelRef.current) {
      console.log('Cleaning up previous typing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
    
    // Create new channel with a unique name based on user/session ID
    const channelName = `typing-${userId || sessionId}-${Date.now()}`;
    console.log(`Creating new typing channel: ${channelName}`);
    
    channelRef.current = supabase.channel(channelName);
    
    channelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current.presenceState();
        const typingData: TypingIndicator[] = [];
        
        console.log('Typing channel state:', state);
        
        Object.keys(state).forEach(key => {
          state[key].forEach((presence: any) => {
            if (presence.isTyping) {
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
        }
      });

    return () => {
      console.log(`Cleaning up typing channel: ${channelName}`);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [userId, sessionId]);

  const setTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !isSubscribedRef.current) {
      console.log('Cannot set typing status: channel not ready');
      return;
    }
    
    console.log(`Setting typing status: ${isTyping}`);
    
    try {
      await channelRef.current.track({
        userId: userId || undefined,
        sessionId: userId ? undefined : sessionId,
        isTyping,
        lastTyped: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking typing status:', error);
    }
  }, [userId, sessionId]);

  const getTypingIndicator = useCallback(() => {
    const filteredTypingUsers = userId
      ? typingUsers.filter(user => user.userId !== userId && !user.sessionId)
      : typingUsers.filter(user => user.sessionId !== sessionId && !user.sessionId);
    
    console.log('Filtered typing users:', filteredTypingUsers);
    return filteredTypingUsers;
  }, [typingUsers, userId, sessionId]);

  return { setTypingStatus, typingUsers: getTypingIndicator() };
};
