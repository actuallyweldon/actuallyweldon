import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import MessageList from '../MessageList';
import MessageInput from '../MessageInput';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/types/message';
import ConversationHeader from './ConversationHeader';
import { formatMessage } from '@/utils/messageFormatting';

interface ConversationViewProps {
  userId: string;
  onBack?: () => void;
}

const ConversationView: React.FC<ConversationViewProps> = ({ userId, onBack }) => {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ username?: string }>({});
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
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
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching messages:', error);
          setError(`Could not load messages: ${error.message}`);
          return;
        }

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

    fetchUserInfo();
    fetchMessages();

    const channel = supabase
      .channel(`messages-${userId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.sender_id !== userId && newMessage.recipient_id !== userId) return;

          const formattedMessage = formatMessage(newMessage);
          setMessages((current) => [...current, formattedMessage]);
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          console.error('Supabase channel disconnected or error:', status);
          
          setTimeout(() => {
            channel.subscribe();
            setConnectionStatus('connecting');
          }, 5000);
        } else {
          setConnectionStatus('connecting');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleSendMessage = async (content: string) => {
    try {
      setError(null);
      const newMessage = {
        content,
        sender_id: null,
        is_admin: true,
        recipient_id: userId,
        session_id: null
      };

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
    if (userInfo.username) {
      return userInfo.username;
    }
    return `User ${userId.slice(0, 8)}`;
  };

  return (
    <div className="flex flex-col h-full">
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
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>
      
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default ConversationView;
