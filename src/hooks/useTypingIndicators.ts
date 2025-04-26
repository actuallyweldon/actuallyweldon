
import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TypingIndicator } from '@/types/message';

export const useTypingIndicators = (userId: string | null, sessionId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  useEffect(() => {
    if (!sessionId && !userId) return;

    const typingChannel = supabase.channel('typing');
    
    typingChannel
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const typingData: TypingIndicator[] = [];
        
        console.log('Typing channel state:', state); // Added logging
        
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
        
        console.log('Updated typing data:', typingData); // Added logging
        setTypingUsers(typingData);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [userId, sessionId]);

  const setTypingStatus = useCallback(async (isTyping: boolean) => {
    const typingChannel = supabase.channel('typing');
    
    console.log(`Setting typing status: ${isTyping}`); // Added logging
    
    await typingChannel.track({
      userId: userId || undefined,
      sessionId: userId ? undefined : sessionId,
      isTyping,
      lastTyped: new Date().toISOString()
    });
  }, [userId, sessionId]);

  const getTypingIndicator = useCallback(() => {
    const filteredTypingUsers = userId
      ? typingUsers.filter(user => user.userId !== userId && !user.sessionId)
      : typingUsers.filter(user => user.sessionId !== sessionId && !user.sessionId);
    
    console.log('Filtered typing users:', filteredTypingUsers); // Added logging
    return filteredTypingUsers;
  }, [typingUsers, userId, sessionId]);

  return { setTypingStatus, typingUsers: getTypingIndicator() };
};
