
import { useState, useEffect, useCallback } from 'react';
import { Message, TypingIndicator } from '@/types/message';
import { supabase } from '@/integrations/supabase/client';
import { playMessageSound } from '../utils/sound';
import { useToast } from './use-toast';

export const useMessages = (userId: string | null, sessionId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionId && !userId) {
      setIsLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        setError(null);
        const query = supabase
          .from('messages')
          .select('*');

        if (userId) {
          // For authenticated users, show their messages and admin responses
          query.or(`sender_id.eq.${userId},and(is_admin.eq.true,recipient_id.eq.${userId})`);
        } else if (sessionId) {
          // For anonymous users, only show messages from their session
          query.eq('session_id', sessionId);
        }

        const { data, error: fetchError } = await query.order('created_at', { ascending: true });

        if (fetchError) {
          throw new Error('Error fetching messages');
        }

        const formattedMessages = (data || []).map((msg): Message => ({
          ...msg,
          sender: msg.is_admin ? 'admin' : 'user',
          timestamp: msg.created_at,
        }));

        setMessages(formattedMessages);
      } catch (err) {
        console.error('Error processing messages:', err);
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Set up real-time listener for new messages
    const channel = supabase
      .channel('public-messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Check if the message belongs to the current user/session
          if (userId && (newMessage.sender_id === userId || 
              (newMessage.is_admin && (!newMessage.recipient_id || newMessage.recipient_id === userId)))) {
            addNewMessage(newMessage);
          } else if (!userId && newMessage.session_id === sessionId) {
            addNewMessage(newMessage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, sessionId]);

  // Set up a presence channel for typing indicators
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

  const addNewMessage = useCallback((newMessage: any) => {
    const formattedMessage: Message = {
      ...newMessage,
      sender: newMessage.is_admin ? 'admin' : 'user',
      timestamp: newMessage.created_at
    };
    
    setMessages((current) => [...current, formattedMessage]);
    
    // Play sound for incoming messages from others
    if (newMessage.sender_id !== userId) {
      playMessageSound();
    }
  }, [userId]);

  const sendMessage = async (content: string) => {
    try {
      const newMessage = {
        content,
        sender_id: sessionId, // Use sessionId as sender_id for anonymous users
        is_admin: false,
        recipient_id: null,
        session_id: sessionId
      };

      const { error } = await supabase.from('messages').insert(newMessage);

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const setTypingStatus = useCallback(async (isTyping: boolean) => {
    const typingChannel = supabase.channel('typing');
    
    await typingChannel.track({
      userId: userId || undefined,
      sessionId: userId ? undefined : sessionId,
      isTyping,
      lastTyped: new Date().toISOString()
    });
  }, [userId, sessionId]);

  const getTypingIndicator = () => {
    // For authenticated users, we only want to show when admins are typing
    if (userId) {
      return typingUsers.filter(user => user.userId !== userId && !user.sessionId);
    }
    
    // For anonymous users, we want to show when admins are typing
    return typingUsers.filter(user => user.sessionId !== sessionId && !user.sessionId);
  };

  return { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    setTypingStatus, 
    typingUsers: getTypingIndicator() 
  };
};
