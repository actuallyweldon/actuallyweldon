
import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/types/message';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useRealtimeMessages } from './useRealtimeMessages';
import { useTypingIndicators } from './useTypingIndicators';
import { formatMessage } from '@/utils/messageFormatting';
import { groupMessagesByThread } from '@/utils/messageThreading';

export const useMessages = (userId: string | null, sessionId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusUpdatesInProgress, setStatusUpdatesInProgress] = useState(false);
  const { toast } = useToast();

  const addNewMessage = useCallback((message: Message) => {
    setMessages((current) => {
      // Check if we already have this message to avoid duplication
      const exists = current.some(msg => msg.id === message.id);
      if (exists) {
        // If the message exists, update it instead of adding a new one
        return current.map(msg => 
          msg.id === message.id ? { ...msg, ...message } : msg
        );
      }
      return [...current, message];
    });
  }, []);

  // Use our improved realtime messages hook
  useRealtimeMessages(userId, sessionId, addNewMessage);
  const { setTypingStatus, typingUsers } = useTypingIndicators(userId, sessionId);

  // Enhanced message status update handling with batch processing and retries
  const markMessagesAsRead = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length || statusUpdatesInProgress) return;
    
    setStatusUpdatesInProgress(true);
    const failedIds: string[] = [];
    
    try {
      // Process in batches of 10 to avoid overloading the DB
      const batchSize = 10;
      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);
        const batchPromises = batch.map(messageId => 
          supabase.rpc('update_message_status', { 
            message_id: messageId, 
            new_status: 'read' as const 
          }).then(({ error }) => {
            if (error) {
              console.error(`Failed to mark message ${messageId} as read:`, error);
              failedIds.push(messageId);
              return false;
            }
            return true;
          })
        );
        
        await Promise.all(batchPromises);
      }
      
      if (failedIds.length > 0) {
        console.warn(`${failedIds.length} messages could not be marked as read`);
        // Don't show toast for every failure to avoid spamming the user
        if (failedIds.length > 5) {
          toast({
            title: "Warning",
            description: `${failedIds.length} message statuses couldn't be updated`,
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error('Error in batch update of message statuses:', err);
      toast({
        title: "Error",
        description: "Failed to update message status",
        variant: "destructive",
      });
    } finally {
      setStatusUpdatesInProgress(false);
    }
  }, [toast, statusUpdatesInProgress]);

  // Initial message loading
  useEffect(() => {
    const fetchMessages = async () => {
      if (!userId && !sessionId) {
        console.log('No userId or sessionId provided, skipping fetch');
        setIsLoading(false);
        return;
      }
      
      try {
        setError(null);
        let query = supabase.from('messages')
          .select('*')
          .order('created_at', { ascending: true });
        
        // No need for explicit filtering as RLS policies will handle this
        const { data, error: fetchError } = await query;

        if (fetchError) {
          throw new Error(`Error fetching messages: ${fetchError.message}`);
        }

        const formattedMessages = (data || []).map(formatMessage);
        
        // Group messages by thread for possible future use
        const threadedMessages = groupMessagesByThread(formattedMessages);
        console.log('Messages grouped by thread:', threadedMessages);
        
        setMessages(formattedMessages);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error processing messages:', errorMessage);
        setError(new Error(errorMessage));
        toast({
          title: "Error Loading Messages",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [userId, sessionId, toast]);

  // Send message with retry logic
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) {
      console.log('Trying to send empty message, ignoring');
      return false;
    }
    
    try {
      if (!userId && !sessionId) {
        throw new Error('No user ID or session ID available');
      }
      
      const newMessage = {
        content,
        sender_id: userId || null,
        is_admin: false,
        recipient_id: null,
        session_id: userId ? null : sessionId,
        message_status: 'sent' as const
      };

      const { error } = await supabase.from('messages').insert(newMessage);

      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      console.error('Error sending message:', errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [userId, sessionId, toast]);

  return { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    setTypingStatus, 
    typingUsers,
    markMessagesAsRead
  };
};
