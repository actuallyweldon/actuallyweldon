
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/message';
import { UserInfo, ConnectionStatus, ConversationError } from '@/types/conversation';
import { useToast } from '@/hooks/use-toast';

export const useConversation = (userId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [errors, setErrors] = useState<ConversationError[]>([]);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const { toast } = useToast();

  // Helper function to handle errors
  const handleError = useCallback((type: ConversationError['type'], message: string, originalError?: any) => {
    const newError: ConversationError = {
      type,
      message,
      originalError,
      timestamp: new Date().toISOString()
    };
    setErrors(prev => [...prev, newError]);
    toast({
      title: "Error",
      description: message,
      variant: "destructive"
    });
    console.error(`[${type} error]`, message, originalError);
  }, [toast]);

  // Fetch user info and messages in one effect
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Parallel requests for better performance
        const [profileResponse, messagesResponse] = await Promise.all([
          // Fetch user profile
          supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', userId)
            .maybeSingle(),
            
          // Fetch messages
          supabase
            .from('messages')
            .select('*')
            .or(`sender_id.eq.${userId},and(is_admin.eq.true,sender_id.eq.${userId})`)
            .order('created_at', { ascending: true })
        ]);
        
        // Handle profile response
        if (profileResponse.error) {
          handleError('fetch', 'Error fetching user profile', profileResponse.error);
        } else if (profileResponse.data) {
          setUserInfo(profileResponse.data);
        }
        
        // Handle messages response
        if (messagesResponse.error) {
          handleError('fetch', 'Could not load messages', messagesResponse.error);
          return;
        }

        if (messagesResponse.data) {
          const formattedMessages = messagesResponse.data.map((msg): Message => ({
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id,
            is_admin: msg.is_admin,
            created_at: msg.created_at,
            sender: msg.is_admin ? 'admin' : 'user',
            timestamp: msg.created_at,
            status: 'delivered' // Default status for loaded messages
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        handleError('fetch', 'Error fetching conversation data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, handleError]);

  // Set up real-time updates in a separate effect
  useEffect(() => {
    // Set up typing indicator expiration
    let typingTimeout: number | undefined;
    
    const clearTypingTimeout = () => {
      if (typingTimeout) {
        window.clearTimeout(typingTimeout);
        typingTimeout = undefined;
      }
    };

    const channel = supabase
      .channel(`messages-${userId}-admin`)
      // Listen for new messages from the user
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `sender_id=eq.${userId}` 
        },
        (payload) => {
          const newMessage = payload.new as any;
          const formattedMessage: Message = {
            id: newMessage.id,
            content: newMessage.content,
            sender_id: newMessage.sender_id,
            is_admin: newMessage.is_admin,
            created_at: newMessage.created_at,
            sender: newMessage.is_admin ? 'admin' : 'user',
            timestamp: newMessage.created_at,
            status: 'delivered'
          };
          setMessages(prev => [...prev, formattedMessage]);
          
          // Clear typing indicator when message is received
          setIsUserTyping(false);
          clearTypingTimeout();
        }
      )
      // Listen for admin messages
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `is_admin=eq.true,sender_id=eq.${userId}` 
        },
        (payload) => {
          const newMessage = payload.new as any;
          const formattedMessage: Message = {
            id: newMessage.id,
            content: newMessage.content,
            sender_id: newMessage.sender_id,
            is_admin: newMessage.is_admin,
            created_at: newMessage.created_at,
            sender: 'admin',
            timestamp: newMessage.created_at,
            status: 'sent'
          };
          setMessages(prev => [...prev, formattedMessage]);
        }
      )
      // Listen for message updates
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId}`
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id 
                ? {
                    ...msg,
                    content: updatedMessage.content,
                    updated_at: updatedMessage.updated_at
                  }
                : msg
            )
          );
        }
      )
      // Listen for message deletions
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${userId}`
        },
        (payload) => {
          // Remove the deleted message
          const deletedMessageId = payload.old.id;
          setMessages(prev => 
            prev.filter(msg => msg.id !== deletedMessageId)
          );
        }
      )
      // Handle presence for typing indicators (assuming we have a presence channel)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Process presence state if needed
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === userId && newPresences.some((p: any) => p.typing)) {
          setIsUserTyping(true);
          
          // Auto-expire typing indicator after 3 seconds
          clearTypingTimeout();
          typingTimeout = window.setTimeout(() => {
            setIsUserTyping(false);
          }, 3000);
        }
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          
          // Implement reconnection with exponential backoff
          const reconnectDelay = 1000 * Math.min(10, Math.pow(2, errors.filter(e => e.type === 'connection').length));
          setTimeout(() => {
            channel.subscribe();
            setConnectionStatus('connecting');
          }, reconnectDelay);
        } else {
          setConnectionStatus('connecting');
        }
      });

    return () => {
      clearTypingTimeout();
      supabase.removeChannel(channel);
    };
  }, [userId, errors]);

  // Enhanced send message function with retry capability
  const handleSendMessage = useCallback(async (content: string) => {
    try {
      // Create pending message to show immediately in UI
      const pendingId = `pending-${Date.now()}`;
      const pendingMessage: Message = {
        id: pendingId,
        content,
        sender_id: userId,
        is_admin: true,
        created_at: new Date().toISOString(),
        sender: 'admin',
        timestamp: new Date().toISOString(),
        status: 'sent',
        pending: true
      };
      
      // Add to messages immediately for responsive UI
      setMessages(prev => [...prev, pendingMessage]);

      // Send to database
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          sender_id: userId,
          is_admin: true
        })
        .select('id')
        .single();

      if (error) {
        // Handle error - remove pending message and show error
        setMessages(prev => prev.filter(msg => msg.id !== pendingId));
        handleError('send', 'Failed to send message', error);
        
        toast({
          title: "Message not sent",
          description: "Tap to retry",
          variant: "destructive",
          action: (
            <button 
              onClick={() => handleSendMessage(content)}
              className="px-3 py-1 rounded bg-primary text-white text-xs"
            >
              Retry
            </button>
          ),
        });
        return;
      }
      
      // Remove pending message and update with real message ID
      setMessages(prev => prev.map(msg => 
        msg.id === pendingId
          ? { ...msg, id: data.id, pending: undefined }
          : msg
      ));
    } catch (error) {
      handleError('send', 'Error sending message', error);
    }
  }, [userId, handleError, toast]);

  return {
    messages,
    loading,
    userInfo,
    connectionStatus,
    isUserTyping,
    errors,
    handleSendMessage
  };
};
