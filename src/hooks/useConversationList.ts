
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, ConnectionStatus, ConversationError } from '@/types/conversation';
import { useToast } from '@/hooks/use-toast';

const CONVERSATIONS_PER_PAGE = 10;

export const useConversationList = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [errors, setErrors] = useState<ConversationError[]>([]);
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

  // Main fetch function with optimized query
  const fetchConversations = useCallback(async (page: number) => {
    setLoading(true);
    
    try {
      // Get distinct sender_ids with the most recent message for each
      const { data, error, count } = await supabase
        .from('messages')
        .select(`
          sender_id,
          content,
          created_at,
          profiles:sender_id (
            username,
            avatar_url
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(CONVERSATIONS_PER_PAGE)
        .range((page - 1) * CONVERSATIONS_PER_PAGE, page * CONVERSATIONS_PER_PAGE - 1);

      if (error) {
        handleError('fetch', 'Could not load conversations', error);
        setLoading(false);
        return;
      }

      if (!data?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      if (count) {
        setTotalPages(Math.ceil(count / CONVERSATIONS_PER_PAGE));
      }

      // Process the data to get unique conversations by sender_id
      const uniqueSenderConversations = new Map<string, Conversation>();
      
      for (const message of data) {
        if (!uniqueSenderConversations.has(message.sender_id)) {
          uniqueSenderConversations.set(message.sender_id, {
            sender_id: message.sender_id,
            last_message: message.content,
            created_at: message.created_at,
            last_message_timestamp: message.created_at,
            user_info: {
              username: message.profiles?.username,
              avatar_url: message.profiles?.avatar_url,
            },
            unread_count: 0
          });
        }
      }

      const conversationList = Array.from(uniqueSenderConversations.values());
      
      // Sort by most recent message
      conversationList.sort((a, b) => 
        new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
      );

      setConversations(conversationList);
    } catch (err) {
      handleError('fetch', 'Could not process conversation data', err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Retry logic for failed operations
  const retryFetchConversations = useCallback(() => {
    fetchConversations(currentPage);
  }, [fetchConversations, currentPage]);

  // Set up real-time updates
  useEffect(() => {
    fetchConversations(currentPage);

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-conversations-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new as any;
          
          try {
            // Fetch associated profile data
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', newMessage.sender_id)
              .maybeSingle();
            
            setConversations(prev => {
              const existingIndex = prev.findIndex(c => c.sender_id === newMessage.sender_id);
              
              if (existingIndex >= 0) {
                // Update existing conversation
                const updated = [...prev];
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  last_message: newMessage.content,
                  last_message_timestamp: newMessage.created_at,
                  created_at: updated[existingIndex].created_at, // Keep original creation date
                  unread_count: (updated[existingIndex].unread_count || 0) + 1
                };
                
                // Re-sort by most recent message
                return updated.sort((a, b) => 
                  new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
                );
              } else if (currentPage === 1) {
                // Add new conversation at the top if we're on the first page
                const newConversation: Conversation = {
                  sender_id: newMessage.sender_id,
                  last_message: newMessage.content,
                  created_at: newMessage.created_at,
                  last_message_timestamp: newMessage.created_at,
                  user_info: {
                    username: profileData?.username,
                    avatar_url: profileData?.avatar_url
                  },
                  unread_count: 1
                };
                return [newConversation, ...prev];
              }
              return prev;
            });
          } catch (err) {
            handleError('update', 'Error handling real-time message update', err);
          }
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMessage = payload.new as any;
          
          setConversations(prev => {
            const existingConvIndex = prev.findIndex(
              c => c.sender_id === updatedMessage.sender_id
            );
            
            if (existingConvIndex >= 0) {
              const updated = [...prev];
              updated[existingConvIndex] = {
                ...updated[existingConvIndex],
                last_message: updatedMessage.content,
                last_message_timestamp: updatedMessage.created_at
              };
              return updated;
            }
            
            return prev;
          });
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          // If a message was deleted, we may need to update the last message
          // This is a more complex case that would require re-fetching
          // For simplicity, we'll just refresh the current page
          fetchConversations(currentPage);
        }
      )
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
      supabase.removeChannel(channel);
    };
  }, [currentPage, fetchConversations, handleError, errors]);

  // Mark conversations as read
  const markConversationAsRead = useCallback(async (senderId: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.sender_id === senderId
          ? { ...conv, unread_count: 0 }
          : conv
      )
    );
  }, []);

  // Return all the necessary data and functions
  return {
    conversations,
    loading,
    currentPage,
    totalPages,
    connectionStatus,
    errors,
    setCurrentPage,
    markConversationAsRead,
    retryFetchConversations
  };
};
