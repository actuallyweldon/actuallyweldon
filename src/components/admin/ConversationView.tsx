import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import MessageList from '../MessageList';
import MessageInput from '../MessageInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/message';
import ConversationHeader from './ConversationHeader';
import { formatMessage } from '@/utils/messageFormatting';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useTypingIndicators } from '@/hooks/useTypingIndicators';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversationViewProps {
  userId: string;
  onBack?: () => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ userId, onBack }) => {
  const isMobile = useIsMobile();
  const { user } = useSupabaseAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ username?: string; name?: string }>({});
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { setTypingStatus, typingUsers } = useTypingIndicators(user?.id || null, null);
  const channelRef = useRef<any>(null);
  
  useEffect(() => {
    const checkUserType = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
        
        if (error || !data) {
          console.log('User ID not found in profiles, assuming anonymous session ID');
          setIsAnonymous(true);
        } else {
          console.log('User ID found in profiles, authenticated user');
          setIsAnonymous(false);
        }
      } catch (error) {
        console.error('Error checking user type:', error);
        setIsAnonymous(true);
      }
    };
    
    checkUserType();
  }, [userId]);

  const fetchUserInfo = async () => {
    if (isAnonymous) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, name')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        setUserInfo(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching messages for:', { userId, isAnonymous });
      
      let query = supabase.from('messages').select('*');
      
      if (isAnonymous) {
        query = query.or(`session_id.eq.${userId},recipient_id.eq.${userId}`);
        console.log('Using session_id query for anonymous user');
      } else {
        query = query.or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
        console.log('Using sender_id query for authenticated user');
      }
      
      const { data, error } = await query.order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        setError(`Could not load messages: ${error.message}`);
        return;
      }

      console.log(`Fetched ${data?.length || 0} messages`);

      if (data) {
        const formattedMessages = data.map(formatMessage);
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error processing messages:', error);
      setError(`Could not process messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
    fetchMessages();
  }, [userId, isAnonymous]);

  useEffect(() => {
    // Clean up previous channel if it exists
    if (channelRef.current) {
      console.log('Cleaning up previous conversation channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    const channelName = `messages-${userId}-${Date.now()}`;
    console.log(`Setting up realtime channel: ${channelName}`);
    
    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as any;
          console.log('New message in conversation view:', newMessage);
          
          const isRelevant = isAnonymous 
            ? (newMessage.session_id === userId || newMessage.recipient_id === userId)
            : (newMessage.sender_id === userId || newMessage.recipient_id === userId);
            
          if (!isRelevant) {
            console.log('Message not relevant for this conversation');
            return;
          }

          console.log('Adding new message to conversation');
          const formattedMessage = formatMessage(newMessage);
          setMessages((current) => [...current, formattedMessage]);
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          console.log('Realtime connection established');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          console.error('Supabase channel disconnected or error:', status);
          
          setConnectionStatus('disconnected');
        } else {
          setConnectionStatus('connecting');
        }
      });

    return () => {
      console.log('Cleaning up channel:', channelName);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, isAnonymous]);

  const handleSendMessage = async (content: string) => {
    try {
      setError(null);
      
      if (!user?.id) {
        console.error('No admin user ID available');
        setError('Not authorized to send messages');
        return;
      }

      const newMessage = {
        content,
        sender_id: user.id,
        is_admin: true,
        recipient_id: userId,
        session_id: null
      };

      console.log('Sending admin message:', newMessage);

      const { error: insertError } = await supabase
        .from('messages')
        .insert(newMessage);

      if (insertError) {
        console.error('Error sending message:', insertError);
        setError(`Failed to send message: ${insertError.message}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getUserDisplayName = () => {
    if (userInfo.name) {
      return userInfo.name;
    }
    if (userInfo.username) {
      return userInfo.username;
    }
    return isAnonymous ? `Anonymous ${userId.slice(0, 8)}` : `User ${userId.slice(0, 8)}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ConversationHeader
        onBack={onBack}
        isMobile={isMobile}
        userDisplayName={getUserDisplayName()}
        connectionStatus={connectionStatus}
      />
      
      {error && (
        <Alert variant="destructive" className="m-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4">
              <MessageList 
                messages={messages} 
                showTypingIndicator={typingUsers.length > 0}
              />
            </div>
          </ScrollArea>
        )}
      </div>
      
      <div className="flex-none py-2">
        <MessageInput 
          onSendMessage={handleSendMessage}
          onTyping={setTypingStatus}
        />
      </div>
    </div>
  );
};

export default ConversationView;
