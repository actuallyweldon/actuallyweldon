
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
        
        setTypingUsers(typingData);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [userId, sessionId]);

  const setTypingStatus = useCallback(async (isTyping: boolean) => {
    const typingChannel = supabase.channel('typing');
    
    await typingChannel.track({
      userId: userId || undefined,
      sessionId: userId ? undefined : sessionId,
      isTyping,
      lastTyped: new Date().toISOString()
    });
  }, [userId, sessionId]);

  const getTypingIndicator = useCallback(() => {
    if (userId) {
      return typingUsers.filter(user => user.userId !== userId && !user.sessionId);
    }
    return typingUsers.filter(user => user.sessionId !== sessionId && !user.sessionId);
  }, [typingUsers, userId, sessionId]);

  return { setTypingStatus, typingUsers: getTypingIndicator() };
};
