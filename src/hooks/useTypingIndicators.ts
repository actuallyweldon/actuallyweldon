
import { useEffect, useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TypingIndicator } from '@/types/message';

export const useTypingIndicators = (userId: string | null, sessionId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const channelRef = useRef(supabase.channel('typing'));

  useEffect(() => {
    if (!sessionId && !userId) return;
    
    const channel = channelRef.current;
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
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
      .subscribe((status) => {
        console.log('Channel subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, sessionId]);

  const setTypingStatus = useCallback(async (isTyping: boolean) => {
    const channel = channelRef.current;
    
    console.log(`Setting typing status: ${isTyping}`);
    
    try {
      await channel.track({
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
