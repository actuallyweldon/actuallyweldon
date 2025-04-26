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
      console.log('No session or user ID provided, skipping messages fetch');
      setIsLoading(false);
      return;
    }

    const fetchMessages = async () => {
      console.log('Fetching messages for:', { userId, sessionId });
      try {
        setError(null);
        const query = supabase
          .from('messages')
          .select('*');

        if (userId) {
          console.log('Fetching messages for authenticated user:', userId);
          query.or(`sender_id.eq.${userId},and(is_admin.eq.true,recipient_id.eq.${userId})`);
        } else if (sessionId) {
          console.log('Fetching messages for anonymous session:', sessionId);
          query.eq('session_id', sessionId);
        }

        const { data, error: fetchError } = await query.order('created_at', { ascending: true });

        if (fetchError) {
          console.error('Error fetching messages:', fetchError);
          throw new Error('Error fetching messages');
        }

        console.log('Fetched messages:', data?.length || 0);
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

    console.log('Setting up real-time listener');
    const channel = supabase
      .channel('public-messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as any;
          
          // Check if the message belongs to the current user/session
          if (userId && (newMessage.sender_id === userId || 
              (newMessage.is_admin && (!newMessage.recipient_id || newMessage.recipient_id === userId)))) {
            console.log('Adding new message for authenticated user');
            addNewMessage(newMessage);
          } else if (!userId && newMessage.session_id === sessionId) {
            console.log('Adding new message for anonymous session');
            addNewMessage(newMessage);
          }
        }
      )
      .subscribe((status) => {
        console.log('Channel subscription status:', status);
      });

    return () => {
      console.log('Cleaning up message listener');
      supabase.removeChannel(channel);
    };
  }, [userId, sessionId, addNewMessage]);

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
    console.log('Processing new message:', newMessage);
    const formattedMessage: Message = {
      ...newMessage,
      sender: newMessage.is_admin ? 'admin' : 'user',
      timestamp: newMessage.created_at
    };
    
    setMessages((current) => [...current, formattedMessage]);
    
    if (newMessage.sender_id !== userId) {
      console.log('Playing message sound for incoming message');
      playMessageSound();
    }
  }, [userId]);

  const sendMessage = async (content: string) => {
    console.log('Attempting to send message:', { content, userId, sessionId });
    try {
      const newMessage = {
        content,
        sender_id: sessionId,
        is_admin: false,
        recipient_id: null,
        session_id: sessionId
      };

      console.log('Sending message payload:', newMessage);
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
      
      console.log('Message sent successfully');
      return true;
    } catch (error) {
      console.error('Unexpected error sending message:', error);
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
    if (userId) {
      return typingUsers.filter(user => user.userId !== userId && !user.sessionId);
    }
    
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
